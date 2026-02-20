/**
 * 자율비행 시스템 (Autopilot)
 * 계단식 PD 제어기 + 웨이포인트 추적
 *
 * RotorPy(rotorpy-main) SE3 컨트롤러 참조 설계:
 *   1. 위치 오차 → 원하는 속도 (속도 제한 포함)
 *   2. 속도 오차 → 원하는 가속도 (실제 velocity state 사용, derivative kick 없음)
 *   3. 가속도 → 물리 엔진 입력 변환 (pitch/roll/throttle/yaw)
 *
 * 기존 PID 방식의 문제점:
 *   - D항이 (error - prevError)/dt 로 계산되어 derivative kick 발생
 *   - I항 windup으로 진동 유발
 *   - 속도 제한 없이 위치 오차에 비례하여 최대 입력 발생
 *
 * 좌표계: Three.js Y-up (X: 오른쪽, Y: 위, -Z: 전방)
 */
(function () {
    'use strict';

    /**
     * PID 컨트롤러 (범용, yaw 등에서 사용)
     */
    class PIDController {
        constructor(kp, ki, kd, outputMin, outputMax) {
            this.kp = kp || 1.0;
            this.ki = ki || 0.0;
            this.kd = kd || 0.0;
            this.outputMin = outputMin !== undefined ? outputMin : -1;
            this.outputMax = outputMax !== undefined ? outputMax : 1;

            this._integral = 0;
            this._prevError = 0;
            this._integralMax = 10;
        }

        update(error, dt) {
            if (dt <= 0) return 0;

            var p = this.kp * error;

            this._integral += error * dt;
            this._integral = Math.max(-this._integralMax, Math.min(this._integralMax, this._integral));
            var i = this.ki * this._integral;

            var d = this.kd * (error - this._prevError) / dt;
            this._prevError = error;

            var output = p + i + d;
            return Math.max(this.outputMin, Math.min(this.outputMax, output));
        }

        reset() {
            this._integral = 0;
            this._prevError = 0;
        }
    }

    /**
     * 자율비행 시스템 (계단식 PD 제어기)
     *
     * 제어 구조:
     *   외부 루프: 위치 오차 → 원하는 속도 (kpPos, 속도 클램프)
     *   내부 루프: 속도 오차 → 원하는 가속도 (kvH/kvV, 실제 velocity 사용)
     *   변환: 월드 가속도 → body-local → 물리 입력 (pitch/roll/throttle)
     */
    class Autopilot {
        constructor(physics) {
            this.physics = physics;

            // === 계단식 PD 게인 (RotorPy SE3 참조 튜닝) ===
            // 외부: 위치 → 원하는 속도
            this._kpPos = 1.5;     // [1/s] 수평 위치 게인
            this._kpPosV = 2.0;    // [1/s] 수직 위치 게인 (더 강하게)

            // 내부: 속도 오차 → 원하는 가속도
            this._kvH = 2.0;      // [1/s] 수평 속도 추적 게인
            this._kvV = 2.5;      // [1/s] 수직 속도 추적 게인

            // 상태
            this.homePosition = { x: 0, y: 0, z: 0 };
            this.target = null;
            this.waypoints = [];
            this.waypointIndex = 0;
            this.isNavigating = false;
            this.arrivalThreshold = 0.8;
            this.flightSpeed = 3;         // 최대 수평 속도 (m/s)
            this.maxVerticalSpeed = 2;    // 최대 수직 속도 (m/s)

            // 디버그 정보 (외부에서 읽기 가능)
            this._lastInput = null;
            this._lastDesiredVel = null;

            // 콜백
            this.onWaypointReached = null;
            this.onNavigationComplete = null;
            this.onStatusUpdate = null;
        }

        /**
         * 홈 위치 설정 (이륙 지점 기록)
         */
        setHome() {
            this.homePosition = {
                x: this.physics.position.x,
                y: this.physics.position.y,
                z: this.physics.position.z
            };
        }

        /**
         * 특정 좌표로 비행 (절대 좌표)
         */
        flyTo(x, y, z) {
            this.target = { x: x, y: y, z: z };
            this.isNavigating = true;
        }

        /**
         * 홈으로 귀환
         */
        returnHome() {
            this.flyTo(this.homePosition.x, 3, this.homePosition.z);
        }

        /**
         * 웨이포인트 경로 비행
         * @param {Array} points - [{x, y, z}, ...] 배열
         */
        followPath(points) {
            this.waypoints = points.slice();
            this.waypointIndex = 0;
            if (this.waypoints.length > 0) {
                var wp = this.waypoints[0];
                this.flyTo(wp.x, wp.y, wp.z);
            }
        }

        /**
         * 현재 위치에서 목표까지 거리
         */
        getDistanceTo(x, z) {
            var dx = x - this.physics.position.x;
            var dz = z - this.physics.position.z;
            return Math.sqrt(dx * dx + dz * dz);
        }

        /**
         * 현재 위치 반환
         */
        getPosition() {
            return {
                x: Math.round(this.physics.position.x * 10) / 10,
                y: Math.round(this.physics.position.y * 10) / 10,
                z: Math.round(this.physics.position.z * 10) / 10
            };
        }

        /**
         * 네비게이션 중지
         */
        stop() {
            this.isNavigating = false;
            this.target = null;
            this.waypoints = [];
            this.waypointIndex = 0;
            this._lastInput = null;
            this._lastDesiredVel = null;
        }

        /**
         * 매 프레임 업데이트 - 계단식 PD 제어
         *
         * 제어 흐름:
         *   1. 위치 오차 → 원하는 속도 (속도 제한)
         *   2. 속도 오차 → 원하는 가속도 (실제 velocity 사용)
         *   3. 월드 가속도 → body-local → 물리 입력
         *
         * @param {number} dt - 델타 타임
         * @returns {Object|null} 입력값 {throttle, pitch, roll, yaw} 또는 null
         */
        update(dt) {
            if (!this.isNavigating || !this.target) return null;

            var pos = this.physics.position;
            var vel = this.physics.velocity;
            var target = this.target;

            // === 1. 위치 오차 (월드 프레임) ===
            var ex = target.x - pos.x;
            var ey = target.y - pos.y;
            var ez = target.z - pos.z;

            var hDist = Math.sqrt(ex * ex + ez * ez);
            var totalDist = Math.sqrt(ex * ex + ey * ey + ez * ez);
            var speed = Math.sqrt(vel.x * vel.x + vel.y * vel.y + vel.z * vel.z);

            // 도착 판정 (거리 + 속도 모두 확인하여 안정적 도착)
            if (totalDist < this.arrivalThreshold && speed < 0.5) {
                this._lastInput = { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
                this._onArrived();
                return this._lastInput;
            }

            // === 2. 위치 → 원하는 속도 (속도 제한) ===
            var desVx = this._kpPos * ex;
            var desVz = this._kpPos * ez;

            // 수평 원하는 속도를 flightSpeed로 클램프
            var desMag = Math.sqrt(desVx * desVx + desVz * desVz);
            if (desMag > this.flightSpeed) {
                var scale = this.flightSpeed / desMag;
                desVx *= scale;
                desVz *= scale;
            }

            // 수직 원하는 속도 클램프
            var desVy = this._kpPosV * ey;
            if (desVy > this.maxVerticalSpeed) desVy = this.maxVerticalSpeed;
            if (desVy < -this.maxVerticalSpeed) desVy = -this.maxVerticalSpeed;

            this._lastDesiredVel = { x: desVx, y: desVy, z: desVz };

            // === 3. 속도 오차 → 원하는 가속도 ===
            // 실제 velocity state 사용 (derivative kick 없음, 안정적 댐핑)
            var ax = this._kvH * (desVx - vel.x);
            var ay = this._kvV * (desVy - vel.y);
            var az = this._kvH * (desVz - vel.z);

            // === 4. 월드 가속도 → body-local 입력 변환 ===
            var yaw = this.physics.rotation.yaw;
            var cosY = Math.cos(yaw);
            var sinY = Math.sin(yaw);

            // 월드 → 바디 로컬 가속도
            var aBodyZ = ax * sinY + az * cosY;    // body +Z 성분 (후방)
            var aBodyX = ax * cosY - az * sinY;    // body +X 성분 (우측)

            // 최대 달성 가능 가속도로 정규화
            var maxHAccel = this.physics.g * Math.sin(this.physics.maxTiltAngle);
            var maxVAccel = this.physics.maxExtraAccel;

            // pitch: +입력 → nose down → 전방(-Z) 가속
            // aBodyZ > 0 → 후방 가속 원함 → 음의 pitch
            var pitch = -aBodyZ / maxHAccel;

            // roll: +입력 → 왼쪽 틸트 → -X 방향 가속
            // aBodyX > 0 → 우측 가속 원함 → 음의 roll
            var roll = -aBodyX / maxHAccel;

            // throttle: 수직 가속도
            var throttle = ay / maxVAccel;

            // === 5. Yaw 제어 (부드럽게) ===
            // 드론 전방 = (-sin(yaw), 0, -cos(yaw)) 이므로
            // 목표를 향하려면 targetYaw = atan2(-ex, -ez)
            var yawInput = 0;
            if (hDist > 2.0) {
                var targetYaw = Math.atan2(-ex, -ez);
                var yawError = targetYaw - yaw;
                while (yawError > Math.PI) yawError -= 2 * Math.PI;
                while (yawError < -Math.PI) yawError += 2 * Math.PI;
                yawInput = this._clamp(yawError * 0.3, -0.3, 0.3);
            }

            // === 6. 안전 범위 클램프 ===
            var maxInput = 0.6;  // 최대 60%로 급격한 기동 방지
            pitch = this._clamp(pitch, -maxInput, maxInput);
            roll = this._clamp(roll, -maxInput, maxInput);
            throttle = this._clamp(throttle, -0.8, 0.8);

            this._lastInput = { throttle: throttle, pitch: pitch, roll: roll, yaw: yawInput };

            // 상태 알림
            if (this.onStatusUpdate) {
                this.onStatusUpdate({
                    target: target,
                    distance: Math.round(totalDist * 10) / 10,
                    hDistance: Math.round(hDist * 10) / 10
                });
            }

            return this._lastInput;
        }

        _onArrived() {
            if (this.onWaypointReached) {
                this.onWaypointReached(this.waypointIndex, this.target);
            }

            // 다음 웨이포인트
            if (this.waypoints.length > 0) {
                this.waypointIndex++;
                if (this.waypointIndex < this.waypoints.length) {
                    var next = this.waypoints[this.waypointIndex];
                    this.target = { x: next.x, y: next.y, z: next.z };
                    return;
                }
            }

            // 네비게이션 완료
            this.isNavigating = false;
            this.target = null;
            if (this.onNavigationComplete) {
                this.onNavigationComplete();
            }
        }

        /**
         * 경로 전체의 물리 기반 예상 비행 시간 계산
         * @param {Array} waypoints - [{x, y, z}, ...] 배열
         * @returns {Object} { totalTime, segmentTimes: [sec, ...] }
         */
        estimatePathTime(waypoints) {
            var totalTime = 0;
            var times = [];
            for (var i = 0; i < waypoints.length - 1; i++) {
                var segTime = this._estimateSegmentTime(waypoints[i], waypoints[i + 1]);
                times.push(segTime);
                totalTime += segTime;
            }
            return { totalTime: totalTime, segmentTimes: times };
        }

        /**
         * 두 지점 간 물리 기반 예상 비행 시간 (사다리꼴 속도 프로파일)
         */
        _estimateSegmentTime(from, to) {
            var dx = to.x - from.x;
            var dz = to.z - from.z;
            var hDist = Math.sqrt(dx * dx + dz * dz);
            var vDist = Math.abs(to.y - from.y);

            var maxHSpeed = this.physics.speedLimit || 15;
            var maxVSpeed = this.physics.speedLimit || 15;
            var maxHAccel = Math.tan(this.physics.maxTiltAngle || Math.PI / 5) * 9.81;
            var maxVAccel = this.physics.maxExtraAccel || 6.0;

            var hTime = this._trapezoidalTime(hDist, maxHSpeed, maxHAccel);
            var vTime = this._trapezoidalTime(vDist, maxVSpeed, maxVAccel);

            var yawAngle = Math.abs(Math.atan2(dx, dz));
            var maxYawRate = this.physics.maxYawRate || 3.0;
            var yawTime = yawAngle / maxYawRate;

            return Math.max(hTime, vTime) + yawTime * 0.3;
        }

        /**
         * 사다리꼴 속도 프로파일 기반 소요 시간 계산
         */
        _trapezoidalTime(dist, maxSpeed, maxAccel) {
            if (dist < 0.001) return 0;
            var accelTime = maxSpeed / maxAccel;
            var accelDist = 0.5 * maxAccel * accelTime * accelTime;

            if (2 * accelDist >= dist) {
                return 2 * Math.sqrt(dist / maxAccel);
            } else {
                var cruiseDist = dist - 2 * accelDist;
                var cruiseTime = cruiseDist / maxSpeed;
                return 2 * accelTime + cruiseTime;
            }
        }

        _clamp(value, min, max) {
            if (value < min) return min;
            if (value > max) return max;
            return value;
        }
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.PIDController = PIDController;
    window.DroneSim.Autopilot = Autopilot;
})();
