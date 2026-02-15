/**
 * 자율비행 시스템 (Autopilot)
 * PID 컨트롤러 + 웨이포인트 추적 + 장애물 회피
 */
(function () {
    'use strict';

    /**
     * PID 컨트롤러
     * 목표값과 현재값의 차이를 기반으로 제어 출력을 계산합니다.
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

            // P: 비례
            var p = this.kp * error;

            // I: 적분 (누적 오차)
            this._integral += error * dt;
            this._integral = Math.max(-this._integralMax, Math.min(this._integralMax, this._integral));
            var i = this.ki * this._integral;

            // D: 미분 (오차 변화율)
            var d = this.kd * (error - this._prevError) / dt;
            this._prevError = error;

            // 합산 후 클램프
            var output = p + i + d;
            return Math.max(this.outputMin, Math.min(this.outputMax, output));
        }

        reset() {
            this._integral = 0;
            this._prevError = 0;
        }
    }

    /**
     * 자율비행 시스템
     */
    class Autopilot {
        constructor(physics) {
            this.physics = physics;

            // PID 컨트롤러 (X, Y, Z 각 축)
            this.pidX = new PIDController(0.8, 0.05, 0.3, -1, 1);
            this.pidY = new PIDController(1.0, 0.1, 0.2, -1, 1);
            this.pidZ = new PIDController(0.8, 0.05, 0.3, -1, 1);
            this.pidYaw = new PIDController(1.5, 0, 0.5, -1, 1);

            // 상태
            this.homePosition = { x: 0, y: 0, z: 0 };
            this.target = null;      // 현재 목표 지점
            this.waypoints = [];     // 웨이포인트 큐
            this.waypointIndex = 0;
            this.isNavigating = false;
            this.arrivalThreshold = 0.8; // 도착 판정 거리
            this.flightSpeed = 3;    // 비행 속도 (m/s)

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
            this._resetPIDs();
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
            this._resetPIDs();
        }

        /**
         * 매 프레임 업데이트 - 자율비행 입력 계산
         * @param {number} dt - 델타 타임
         * @returns {Object|null} 입력값 {throttle, pitch, roll, yaw} 또는 null (비활성)
         */
        update(dt) {
            if (!this.isNavigating || !this.target) return null;

            var pos = this.physics.position;
            var target = this.target;

            // 3D 오차 계산
            var errorX = target.x - pos.x;
            var errorY = target.y - pos.y;
            var errorZ = target.z - pos.z;

            // 수평 거리
            var hDist = Math.sqrt(errorX * errorX + errorZ * errorZ);

            // 도착 판정
            var totalDist = Math.sqrt(errorX * errorX + errorY * errorY + errorZ * errorZ);
            if (totalDist < this.arrivalThreshold) {
                this._onArrived();
                return { throttle: 0, pitch: 0, roll: 0, yaw: 0 };
            }

            // 월드 좌표 → 로컬 좌표 변환 (드론의 yaw 기준)
            var yaw = this.physics.rotation.yaw;
            var cos = Math.cos(yaw);
            var sin = Math.sin(yaw);

            // 로컬 전진(Z-) / 우측(X+) 방향 오차
            var localForward = errorX * sin + errorZ * cos;   // 전방 오차 (Z-)
            var localRight = errorX * cos - errorZ * sin;     // 우측 오차 (X+)

            // 목표 방향으로 yaw 회전
            var targetYaw = Math.atan2(errorX, errorZ);
            var yawError = targetYaw - yaw;
            // -PI ~ PI 범위로 정규화
            while (yawError > Math.PI) yawError -= 2 * Math.PI;
            while (yawError < -Math.PI) yawError += 2 * Math.PI;

            // PID 제어
            var throttle = this.pidY.update(errorY, dt);
            var yawControl = this.pidYaw.update(yawError, dt);

            // 전진/후진 (pitch)과 좌우 (roll)
            // 속도 제한을 위한 스케일링
            var speedScale = Math.min(1, hDist / 3);
            var pitch = this.pidZ.update(-localForward, dt) * speedScale;
            var roll = this.pidX.update(localRight, dt) * speedScale;

            // 상태 알림
            if (this.onStatusUpdate) {
                this.onStatusUpdate({
                    target: target,
                    distance: Math.round(totalDist * 10) / 10,
                    hDistance: Math.round(hDist * 10) / 10
                });
            }

            return {
                throttle: throttle,
                pitch: pitch,
                roll: -roll,
                yaw: yawControl
            };
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
                    this._resetPIDs();
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

        _resetPIDs() {
            this.pidX.reset();
            this.pidY.reset();
            this.pidZ.reset();
            this.pidYaw.reset();
        }
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.PIDController = PIDController;
    window.DroneSim.Autopilot = Autopilot;
})();
