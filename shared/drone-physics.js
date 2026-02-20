/**
 * 드론 물리 엔진 (실제 물리 기반)
 * RotorPy(rotorpy-main) 기반 리지드바디 다이나믹스 구현
 *
 * 핵심 물리 모델:
 * - 쿼터니언 자세 표현 (짐벌락 방지)
 * - 뉴턴-오일러 운동 방정식 (F=ma, τ=Iα)
 * - 4-로터 추력 모델 (T = k_η · ω²)
 * - 모터 동역학 (1차 지연: τ_m)
 * - 공기역학적 항력 (기생항력, 로터 H-force, 유도유입)
 * - SO(3) 자세 제어기
 * - RK4 수치 적분
 *
 * 좌표계: Three.js Y-up (X: 오른쪽, Y: 위, -Z: 전방)
 * 참조: AscTec Hummingbird 쿼드콥터 파라미터 (rotorpy-main/rotorpy/vehicles/hummingbird_params.py)
 */
class DronePhysics {
    constructor(config = {}) {
        // ===== 하위 호환 설정 =====
        this.maxSpeed = config.maxSpeed || config.speedLimit || 15;
        this.maxTiltAngle = config.maxTiltAngle || Math.PI / 6;
        this.autoStabilize = config.autoStabilize !== undefined ? config.autoStabilize : true;
        this.stabilizeRate = config.stabilizeRate || 3.0;
        this.speedLimit = config.speedLimit || this.maxSpeed;
        this.batteryDrainRate = config.batteryDrainRate || 0.5;

        // ===== 물리 파라미터 (AscTec Hummingbird 기반) =====
        this.mass = config.mass || 0.500;           // kg
        this.g = 9.81;                               // m/s²

        // 관성 모멘트 (대각, Y-up: X=roll, Y=yaw, Z=pitch)
        this.Ixx = 3.65e-3;    // kg·m² (roll)
        this.Iyy = 7.03e-3;    // kg·m² (yaw)  — rotorpy Izz
        this.Izz = 3.68e-3;    // kg·m² (pitch) — rotorpy Iyy
        this._invIxx = 1 / this.Ixx;
        this._invIyy = 1 / this.Iyy;
        this._invIzz = 1 / this.Izz;

        // 로터 파라미터
        this.armLength = 0.17;                       // m
        this.k_eta = 5.57e-6;                        // 추력계수 N/(rad/s)²
        this.k_m = 1.36e-7;                          // yaw 모멘트 계수 Nm/(rad/s)²
        this.tau_m = 0.015;                           // 모터 응답시간 (s)
        this.rotorSpeedMin = 0;
        this.rotorSpeedMax = 1500;                    // rad/s

        // 공기역학 항력 (dragCoefficient 설정에 비례 스케일링)
        var dragScale = (config.dragCoefficient || 0.3) / 0.3;
        this.c_Dx = 0.5e-2 * dragScale;              // 기생항력 body X
        this.c_Dy = 1.0e-2 * dragScale;              // 기생항력 body Y (추력축)
        this.c_Dz = 0.5e-2 * dragScale;              // 기생항력 body Z
        this.k_d = 1.19e-4;                           // 로터항력 계수
        this.k_z = 2.32e-4;                           // 유도유입 계수
        this.k_h = 3.39e-3;                           // translational lift 계수
        this.windDragLin = 0.06;                      // 선형 바람 항력 (저속 민감도)
        this.cpOffset = 0.025;                         // 풍압 중심 오프셋 (바람 토크)

        // 자세 제어기 게인 (stabilizeRate에 비례)
        var gainScale = this.stabilizeRate / 3.0;
        this.kp_att = 544 * gainScale;
        this.kd_att = 46.64 * gainScale;
        this.maxYawRate = 3.0;                        // rad/s

        // 수직 속도 제어 (rotorpy SE3Control 참고: kp_pos[z]=15, kd_pos[z]=9)
        this.maxClimbRate = 7.0;                      // m/s 최대 상승/하강 속도 (체감상 빠른 반응)
        this.kp_vel_z = 4.0;                          // 속도제한·자동감속 P 게인
        this.maxVertAccel = 8.0;                      // m/s² 수직가속 클램프 (throttle=0.8 → 6.4 m/s²)

        // 추력: 모터 물리 한계 기반
        this.maxExtraAccel = 6.0;                     // m/s² (레거시 호환)
        this._maxThrustPerMotor = this.k_eta * this.rotorSpeedMax * this.rotorSpeedMax;
        this._maxTotalThrust = 4 * this._maxThrustPerMotor;

        // 물리 서브스텝
        this._physicsDt = 0.004;                      // 250Hz

        // ===== 로터 배치 (Y-up, -Z 전방, X-config) =====
        var d = this.armLength;
        var sq = 0.70710678118;
        this._rotorPos = [
            [ d * sq, 0, -d * sq],   // r1 전방-우측
            [-d * sq, 0, -d * sq],   // r2 전방-좌측
            [-d * sq, 0,  d * sq],   // r3 후방-좌측
            [ d * sq, 0,  d * sq]    // r4 후방-우측
        ];
        this._rotorDir = [-1, 1, -1, 1];             // CW=-1, CCW=+1

        // 제어 할당 행렬 (X-config 해석적 역행렬)
        this._computeAllocationMatrix();

        // 호버 로터 속도
        this._hoverSpeed = Math.sqrt(this.mass * this.g / (4 * this.k_eta));

        // ===== 공개 상태 (API 호환) =====
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, roll: 0, yaw: 0 };
        this.angularVelocity = { pitch: 0, roll: 0, yaw: 0 };

        this.isFlying = false;
        this.isLanding = false;
        this.battery = 100;
        this.groundLevel = 0;

        this.onCollision = null;
        this.onLanded = null;

        // ===== 내부 물리 상태 =====
        this._pos = [0, 0, 0];
        this._vel = [0, 0, 0];
        this._quat = [0, 0, 0, 1];                   // [qx, qy, qz, qw]
        this._omega = [0, 0, 0];                      // body rates [wx, wy, wz]
        this._rotorSpeeds = [0, 0, 0, 0];             // rad/s

        // 바람 속도 (world frame)
        this._windVel = [0, 0, 0];                      // [wx, wy, wz]
        this._windProfile = null;                        // wind model reference
        this._simTime = 0;                               // 누적 시뮬레이션 시간

        this._takeoffPhase = false;
        this._takeoffTarget = 2;
    }

    // ================================================================
    //  제어 할당 행렬
    // ================================================================
    _computeAllocationMatrix() {
        // X-config 쿼드콥터의 해석적 역할당 행렬
        // f_to_TM: [T1..T4] → [F_total, Mx_roll, My_yaw, Mz_pitch]
        // TM_to_f: [F, Mx, My, Mz] → [T1..T4]  (역행렬)
        var L = this.armLength * 0.70710678118;
        var k = this.k_m / this.k_eta;
        this._alloc = {
            invF: 0.25,
            invL: 0.25 / L,
            invK: 0.25 / k
        };
    }

    _allocateMotors(F, Mx, My, Mz) {
        var c = this._alloc;
        var fF = c.invF * F;
        var fMx = c.invL * Mx;
        var fMy = c.invK * My;
        var fMz = c.invL * Mz;
        return [
            fF + fMx - fMy + fMz,   // T1 전방-우측
            fF + fMx + fMy - fMz,   // T2 전방-좌측
            fF - fMx - fMy - fMz,   // T3 후방-좌측
            fF - fMx + fMy + fMz    // T4 후방-우측
        ];
    }

    // ================================================================
    //  상태 관리
    // ================================================================
    reset() {
        this._pos = [0, 0, 0];
        this._vel = [0, 0, 0];
        this._quat = [0, 0, 0, 1];
        this._omega = [0, 0, 0];
        this._rotorSpeeds = [0, 0, 0, 0];
        // _windVel, _windProfile은 리셋하지 않음 — 바람은 외부에서 설정한 대로 유지
        this._simTime = 0;
        this._takeoffPhase = false;
        this.isFlying = false;
        this.isLanding = false;
        this.battery = 100;
        this._syncPublicState();
    }

    setWind(windProfile) {
        this._windProfile = windProfile;
    }

    getWindVelocity() {
        return { x: this._windVel[0], y: this._windVel[1], z: this._windVel[2] };
    }

    takeoff(targetHeight) {
        if (targetHeight === undefined) targetHeight = 2;
        if (this.isFlying) return;
        this.isFlying = true;
        this.isLanding = false;
        this._takeoffTarget = targetHeight;
        this._takeoffPhase = true;
        // 로터를 호버 속도로 초기화
        var hs = this._hoverSpeed;
        this._rotorSpeeds = [hs, hs, hs, hs];
    }

    land() {
        if (!this.isFlying) return;
        this.isLanding = true;
    }

    // ================================================================
    //  메인 물리 업데이트
    // ================================================================
    /**
     * @param {number} dt - 델타 타임 (초)
     * @param {Object} input - 조작 입력 { throttle, pitch, roll, yaw } 각각 -1 ~ 1
     */
    update(dt, input) {
        if (!input) input = {};
        if (!this.isFlying && !this._takeoffPhase) return this.getState();

        dt = Math.min(dt, 0.05);

        // 바람 업데이트
        this._simTime += dt;
        if (this._windProfile) {
            var w = this._windProfile.update(this._simTime, dt);
            this._windVel[0] = w[0];
            this._windVel[1] = w[1];
            this._windVel[2] = w[2];
        }

        var throttle = this._clamp(input.throttle || 0, -1, 1);
        var pitchInput = this._clamp(input.pitch || 0, -1, 1);
        var rollInput = this._clamp(input.roll || 0, -1, 1);
        var yawInput = this._clamp(input.yaw || 0, -1, 1);

        // === 1. 추력 및 원하는 자세 결정 ===
        var collectiveThrust, desPitch, desRoll, desYawRate;

        if (this._takeoffPhase) {
            // 이륙: PD 고도 제어
            var altError = this._takeoffTarget - this._pos[1];
            var velY = this._vel[1];
            var aDesired = 3.0 * altError - 2.0 * velY;
            collectiveThrust = this.mass * (this.g + this._clamp(aDesired, -4, 6));
            desPitch = 0;
            desRoll = 0;
            desYawRate = 0;

            if (Math.abs(altError) < 0.15 && Math.abs(velY) < 0.3) {
                this._takeoffPhase = false;
            }
        } else if (this.isLanding) {
            // 착륙: 하강 속도 PD 제어
            var descentRate = -1.0;
            var velErr = descentRate - this._vel[1];
            var aLand = 2.0 * velErr;
            collectiveThrust = this.mass * (this.g + this._clamp(aLand, -5, 3));
            desPitch = 0;
            desRoll = 0;
            desYawRate = 0;
        } else {
            // 일반 비행: 가속도 기반 + 속도 캡 (rotorpy SE3Control 참고)
            // 입력 → 가속도, 속도 한계 도달 시 소프트 브레이크, 무입력 시 자동 감속
            var velY = this._vel[1];
            var aDesired;
            if (Math.abs(throttle) > 0.01) {
                // 입력 활성: 가속도 직접 지정 → 속도 누적 → 꾹 누르면 빨라짐
                aDesired = throttle * this.maxVertAccel;
                // 속도 한계 도달 시 소프트 브레이크
                if (velY > this.maxClimbRate && aDesired > 0) {
                    aDesired = this.kp_vel_z * (this.maxClimbRate - velY);
                } else if (velY < -this.maxClimbRate && aDesired < 0) {
                    aDesired = this.kp_vel_z * (-this.maxClimbRate - velY);
                }
            } else {
                // 무입력: PD 감속 → 고도 유지
                aDesired = -this.kp_vel_z * velY;
            }
            aDesired = this._clamp(aDesired, -this.maxVertAccel, this.maxVertAccel);
            collectiveThrust = this.mass * (this.g + aDesired);
            if (collectiveThrust < 0) collectiveThrust = 0;
            if (collectiveThrust > this._maxTotalThrust) collectiveThrust = this._maxTotalThrust;

            if (this.autoStabilize) {
                // 자세 모드: 입력 → 목표 자세각
                desPitch = -pitchInput * this.maxTiltAngle;      // +input → nose down → forward
                desRoll = rollInput * this.maxTiltAngle;          // +input → left tilt → left
                desYawRate = yawInput * this.maxYawRate;          // +input → CCW → left turn
            } else {
                // 레이트 모드: 입력 → body rates (아래에서 별도 처리)
                desPitch = pitchInput;
                desRoll = rollInput;
                desYawRate = yawInput * this.maxYawRate;
            }
        }

        // === 2. 자세 제어기 → 모멘트 명령 ===
        var cmdMoment;
        if (!this.autoStabilize && !this._takeoffPhase && !this.isLanding) {
            cmdMoment = this._rateController(desPitch, desRoll, desYawRate);
        } else {
            cmdMoment = this._attitudeController(desPitch, desRoll, desYawRate);
        }

        // === 3. 모터 할당 ===
        var motorThrusts = this._allocateMotors(
            collectiveThrust, cmdMoment[0], cmdMoment[1], cmdMoment[2]
        );

        var cmdRotorSpeeds = [0, 0, 0, 0];
        for (var i = 0; i < 4; i++) {
            var t = motorThrusts[i] > 0 ? motorThrusts[i] : 0;
            cmdRotorSpeeds[i] = Math.sqrt(t / this.k_eta);
            if (cmdRotorSpeeds[i] > this.rotorSpeedMax) cmdRotorSpeeds[i] = this.rotorSpeedMax;
        }

        // === 4. RK4 서브스텝 적분 ===
        var remaining = dt;
        while (remaining > 1e-6) {
            var h = remaining < this._physicsDt ? remaining : this._physicsDt;
            this._rk4Step(cmdRotorSpeeds, h);
            remaining -= h;
        }

        // 쿼터니언 정규화
        this._quatNormalize();

        // === 5. 지면 충돌 처리 ===
        if (this._pos[1] < this.groundLevel) {
            this._pos[1] = this.groundLevel;
            var impactSpeed = this._vel[1] < 0 ? -this._vel[1] : this._vel[1];
            this._vel[1] = 0;

            if (impactSpeed > 3 && this.onCollision) {
                this.onCollision(impactSpeed);
            }

            this._vel[0] *= 0.7;
            this._vel[2] *= 0.7;
            this._omega = [0, 0, 0];
        }

        // 착륙 완료 판정
        if (this.isLanding && this._pos[1] <= this.groundLevel + 0.05) {
            this._pos[1] = this.groundLevel;
            this._vel = [0, 0, 0];
            this._omega = [0, 0, 0];
            var euler = this._quatToEulerYXZ(this._quat);
            this._quat = this._eulerToQuatYXZ(0, euler[1], 0);
            this._rotorSpeeds = [0, 0, 0, 0];
            this.isFlying = false;
            this.isLanding = false;
            this._syncPublicState();
            if (this.onLanded) this.onLanded();
            return this.getState();
        }

        // 높이 제한 (50m)
        if (this._pos[1] > 50) {
            this._pos[1] = 50;
            if (this._vel[1] > 0) this._vel[1] = 0;
        }

        // 속도 제한
        var hSpd = Math.sqrt(this._vel[0] * this._vel[0] + this._vel[2] * this._vel[2]);
        if (hSpd > this.speedLimit) {
            var sc = this.speedLimit / hSpd;
            this._vel[0] *= sc;
            this._vel[2] *= sc;
        }
        if (this._vel[1] > this.speedLimit) this._vel[1] = this.speedLimit;
        if (this._vel[1] < -this.speedLimit) this._vel[1] = -this.speedLimit;

        // === 6. 배터리 ===
        if (this.isFlying) {
            this.battery -= this.batteryDrainRate * dt;
            if (this.battery <= 0) {
                this.battery = 0;
                this.land();
            }
        }

        // === 7. 공개 상태 동기화 ===
        this._syncPublicState();
        return this.getState();
    }

    // ================================================================
    //  SO(3) 자세 제어기 (attitude mode)
    // ================================================================
    _attitudeController(desPitch, desRoll, desYawRate) {
        // 현재 yaw를 유지하면서 목표 pitch/roll 추적
        var euler = this._quatToEulerYXZ(this._quat);
        var currentYaw = euler[1];

        var qDes = this._eulerToQuatYXZ(desPitch, currentYaw, desRoll);

        var R = this._quatToRotMat(this._quat);
        var Rd = this._quatToRotMat(qDes);

        // SO(3) 오차: e_R = 0.5 * vee(Rd^T R - R^T Rd)
        var RdtR = this._mat3Mul(this._mat3T(Rd), R);
        var RtRd = this._mat3Mul(this._mat3T(R), Rd);

        var attErr = [
            -0.5 * (RdtR[1][2] - RtRd[1][2]),
             0.5 * (RdtR[0][2] - RtRd[0][2]),
            -0.5 * (RdtR[0][1] - RtRd[0][1])
        ];

        var w = this._omega;
        var Iw0 = this.Ixx * w[0], Iw1 = this.Iyy * w[1], Iw2 = this.Izz * w[2];
        // w × (I·w)
        var gyr0 = w[1] * Iw2 - w[2] * Iw1;
        var gyr1 = w[2] * Iw0 - w[0] * Iw2;
        var gyr2 = w[0] * Iw1 - w[1] * Iw0;

        var kp = this.kp_att;
        var kd = this.kd_att;

        return [
            this.Ixx * (-kp * attErr[0] - kd * (w[0])) + gyr0,
            this.Iyy * (-kp * attErr[1] - kd * (w[1] - desYawRate)) + gyr1,
            this.Izz * (-kp * attErr[2] - kd * (w[2])) + gyr2
        ];
    }

    // ================================================================
    //  레이트 제어기 (rate mode, autoStabilize=false)
    // ================================================================
    _rateController(pitchInput, rollInput, desYawRate) {
        var maxBodyRate = 5.0;
        var wDes = [
            rollInput * maxBodyRate,        // wx (roll rate)
            desYawRate,                      // wy (yaw rate)
            -pitchInput * maxBodyRate        // wz (pitch rate)
        ];

        var w = this._omega;
        var kd = this.kd_att * 0.5;
        var Iw0 = this.Ixx * w[0], Iw1 = this.Iyy * w[1], Iw2 = this.Izz * w[2];
        var gyr0 = w[1] * Iw2 - w[2] * Iw1;
        var gyr1 = w[2] * Iw0 - w[0] * Iw2;
        var gyr2 = w[0] * Iw1 - w[1] * Iw0;

        return [
            this.Ixx * (-kd * (w[0] - wDes[0])) + gyr0,
            this.Iyy * (-kd * (w[1] - wDes[1])) + gyr1,
            this.Izz * (-kd * (w[2] - wDes[2])) + gyr2
        ];
    }

    // ================================================================
    //  RK4 적분
    // ================================================================
    _rk4Step(cmdRotorSpeeds, h) {
        var s = this._packState();
        var k1 = this._sDot(s, cmdRotorSpeeds);

        var s2 = new Array(17);
        for (var i = 0; i < 17; i++) s2[i] = s[i] + 0.5 * h * k1[i];
        var k2 = this._sDot(s2, cmdRotorSpeeds);

        var s3 = new Array(17);
        for (i = 0; i < 17; i++) s3[i] = s[i] + 0.5 * h * k2[i];
        var k3 = this._sDot(s3, cmdRotorSpeeds);

        var s4 = new Array(17);
        for (i = 0; i < 17; i++) s4[i] = s[i] + h * k3[i];
        var k4 = this._sDot(s4, cmdRotorSpeeds);

        var h6 = h / 6;
        for (i = 0; i < 17; i++) {
            s[i] += h6 * (k1[i] + 2 * k2[i] + 2 * k3[i] + k4[i]);
        }

        this._unpackState(s);
    }

    _packState() {
        return [
            this._pos[0], this._pos[1], this._pos[2],
            this._vel[0], this._vel[1], this._vel[2],
            this._quat[0], this._quat[1], this._quat[2], this._quat[3],
            this._omega[0], this._omega[1], this._omega[2],
            this._rotorSpeeds[0], this._rotorSpeeds[1], this._rotorSpeeds[2], this._rotorSpeeds[3]
        ];
    }

    _unpackState(s) {
        this._pos[0] = s[0];  this._pos[1] = s[1];  this._pos[2] = s[2];
        this._vel[0] = s[3];  this._vel[1] = s[4];  this._vel[2] = s[5];
        this._quat[0] = s[6]; this._quat[1] = s[7]; this._quat[2] = s[8]; this._quat[3] = s[9];
        this._omega[0] = s[10]; this._omega[1] = s[11]; this._omega[2] = s[12];
        this._rotorSpeeds[0] = s[13]; this._rotorSpeeds[1] = s[14];
        this._rotorSpeeds[2] = s[15]; this._rotorSpeeds[3] = s[16];
    }

    // ================================================================
    //  상태 도함수 (ODE right-hand side)
    // ================================================================
    _sDot(s, cmdRotorSpeeds) {
        var vx = s[3], vy = s[4], vz = s[5];
        var qx = s[6], qy = s[7], qz = s[8], qw = s[9];
        var wx = s[10], wy = s[11], wz = s[12];
        var rs0 = s[13], rs1 = s[14], rs2 = s[15], rs3 = s[16];

        // 회전 행렬 (body → world)
        var xx = qx * qx, yy = qy * qy, zz = qz * qz;
        var xy = qx * qy, xz = qx * qz, yz = qy * qz;
        var wxq = qw * qx, wyq = qw * qy, wzq = qw * qz;

        var R00 = 1 - 2 * (yy + zz), R01 = 2 * (xy - wzq), R02 = 2 * (xz + wyq);
        var R10 = 2 * (xy + wzq),    R11 = 1 - 2 * (xx + zz), R12 = 2 * (yz - wxq);
        var R20 = 2 * (xz - wyq),    R21 = 2 * (yz + wxq),    R22 = 1 - 2 * (xx + yy);

        // 모터 가속도 (1차 지연)
        var invTau = 1 / this.tau_m;
        var ra0 = invTau * (cmdRotorSpeeds[0] - rs0);
        var ra1 = invTau * (cmdRotorSpeeds[1] - rs1);
        var ra2 = invTau * (cmdRotorSpeeds[2] - rs2);
        var ra3 = invTau * (cmdRotorSpeeds[3] - rs3);

        // 쿼터니언 도함수: qdot = 0.5 * G^T * omega
        var qd0 = 0.5 * ( qw * wx - qz * wy + qy * wz);
        var qd1 = 0.5 * ( qz * wx + qw * wy - qx * wz);
        var qd2 = 0.5 * (-qy * wx + qx * wy + qw * wz);
        var qd3 = 0.5 * (-qx * wx - qy * wy - qz * wz);

        // body frame 대기속도: R^T * (v - v_wind) — 상대 대기속도
        var relVx = vx - this._windVel[0];
        var relVy = vy - this._windVel[1];
        var relVz = vz - this._windVel[2];
        var bvx = R00 * relVx + R10 * relVy + R20 * relVz;
        var bvy = R01 * relVx + R11 * relVy + R21 * relVz;
        var bvz = R02 * relVx + R12 * relVy + R22 * relVz;

        // body wrench 계산 (인라인)
        var FBx = 0, FBy = 0, FBz = 0;
        var MBx = 0, MBy = 0, MBz = 0;

        // 기생 항력: D = -|v_body| * diag(c_Dx, c_Dy, c_Dz) * v_body (2차 항력)
        var bvNorm = Math.sqrt(bvx * bvx + bvy * bvy + bvz * bvz);
        FBx = -bvNorm * this.c_Dx * bvx;
        FBy = -bvNorm * this.c_Dy * bvy;
        FBz = -bvNorm * this.c_Dz * bvz;

        // 선형 바람 항력: 저속에서도 바람을 체감 (프로펠러 디스크 항력 모델)
        FBx -= this.windDragLin * bvx;
        FBz -= this.windDragLin * bvz;

        // 바람에 의한 기체 토크: 풍압 중심이 무게 중심과 어긋남 → 피치/롤 모멘트
        // kp_att/kd_att 값이 낮으면 바람에 기체가 기울어지는 게 보임
        var cp = this.cpOffset;
        MBz += -bvNorm * this.c_Dx * bvx * cp;    // pitch 모멘트 (역풍 → 기수 들림)
        MBx +=  bvNorm * this.c_Dz * bvz * cp;    // roll 모멘트 (측풍 → 기울기)

        // 4개 로터 순회
        var rotorSpeeds = [rs0, rs1, rs2, rs3];
        for (var i = 0; i < 4; i++) {
            var omega_i = rotorSpeeds[i];
            var omegaSq = omega_i * omega_i;
            var rx = this._rotorPos[i][0];
            var ry_r = this._rotorPos[i][1];
            var rz = this._rotorPos[i][2];

            // 로컬 대기속도: v_body + w × r_i
            var wcrx = wy * rz - wz * ry_r;
            var wcry = wz * rx - wx * rz;
            var wcrz = wx * ry_r - wy * rx;
            var vlx = bvx + wcrx;
            var vly = bvy + wcry;
            var vlz = bvz + wcrz;

            // 추력 (body +Y)
            var T = this.k_eta * omegaSq;

            // translational lift: 횡방향 대기속도가 추력에 기여
            var vlLateralSq = vlx * vlx + vlz * vlz;
            T += this.k_h * vlLateralSq;

            // 로터 항력 (H-force)
            var Hx = -omega_i * this.k_d * vlx;
            var Hy = -omega_i * this.k_z * vly;
            var Hz = -omega_i * this.k_d * vlz;

            // 로터 총 힘
            var Fix = Hx;
            var Fiy = T + Hy;
            var Fiz = Hz;

            FBx += Fix;
            FBy += Fiy;
            FBz += Fiz;

            // 힘에 의한 모멘트: r × F
            MBx += ry_r * Fiz - rz * Fiy;
            MBy += rz * Fix - rx * Fiz;
            MBz += rx * Fiy - ry_r * Fix;

            // yaw 반작용 토크
            MBy += this._rotorDir[i] * this.k_m * omegaSq;
        }

        // 힘을 world frame으로 회전: F_world = R * F_body
        var Fwx = R00 * FBx + R01 * FBy + R02 * FBz;
        var Fwy = R10 * FBx + R11 * FBy + R12 * FBz;
        var Fwz = R20 * FBx + R21 * FBy + R22 * FBz;

        // 속도 도함수: v_dot = [0, -g, 0] + F_world / m
        var invM = 1 / this.mass;
        var vdx = Fwx * invM;
        var vdy = -this.g + Fwy * invM;
        var vdz = Fwz * invM;

        // 각속도 도함수: w_dot = I^-1 * (M - w × (I*w))
        var Iwx = this.Ixx * wx, Iwy = this.Iyy * wy, Iwz = this.Izz * wz;
        var gx = wy * Iwz - wz * Iwy;
        var gy = wz * Iwx - wx * Iwz;
        var gz = wx * Iwy - wy * Iwx;

        var wdx = this._invIxx * (MBx - gx);
        var wdy = this._invIyy * (MBy - gy);
        var wdz = this._invIzz * (MBz - gz);

        return [
            vx, vy, vz,
            vdx, vdy, vdz,
            qd0, qd1, qd2, qd3,
            wdx, wdy, wdz,
            ra0, ra1, ra2, ra3
        ];
    }

    // ================================================================
    //  공개 상태 동기화 및 반환
    // ================================================================
    _syncPublicState() {
        this.position.x = this._pos[0];
        this.position.y = this._pos[1];
        this.position.z = this._pos[2];

        this.velocity.x = this._vel[0];
        this.velocity.y = this._vel[1];
        this.velocity.z = this._vel[2];

        var euler = this._quatToEulerYXZ(this._quat);
        this.rotation.pitch = euler[0];
        this.rotation.yaw = euler[1];
        this.rotation.roll = euler[2];

        this.angularVelocity.roll = this._omega[0];
        this.angularVelocity.yaw = this._omega[1];
        this.angularVelocity.pitch = this._omega[2];
    }

    getState() {
        var hSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        var totalSpeed = Math.sqrt(
            this.velocity.x * this.velocity.x +
            this.velocity.y * this.velocity.y +
            this.velocity.z * this.velocity.z
        );
        var heading = (this.rotation.yaw * 180 / Math.PI) % 360;
        if (heading < 0) heading += 360;

        return {
            position: { x: this.position.x, y: this.position.y, z: this.position.z },
            velocity: { x: this.velocity.x, y: this.velocity.y, z: this.velocity.z },
            rotation: { pitch: this.rotation.pitch, roll: this.rotation.roll, yaw: this.rotation.yaw },
            altitude: this.position.y,
            speed: totalSpeed,
            horizontalSpeed: hSpeed,
            verticalSpeed: this.velocity.y,
            heading: heading,
            battery: this.battery,
            isFlying: this.isFlying,
            isLanding: this.isLanding,
            wind: { x: this._windVel[0], y: this._windVel[1], z: this._windVel[2] },
            windSpeed: Math.sqrt(this._windVel[0] * this._windVel[0] + this._windVel[1] * this._windVel[1] + this._windVel[2] * this._windVel[2])
        };
    }

    // ================================================================
    //  쿼터니언 수학
    // ================================================================
    _quatNormalize() {
        var q = this._quat;
        var n = Math.sqrt(q[0] * q[0] + q[1] * q[1] + q[2] * q[2] + q[3] * q[3]);
        if (n > 1e-10) {
            var inv = 1 / n;
            q[0] *= inv; q[1] *= inv; q[2] *= inv; q[3] *= inv;
        }
    }

    _quatToRotMat(q) {
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        var xx = qx * qx, yy = qy * qy, zz = qz * qz;
        var xy = qx * qy, xz = qx * qz, yz = qy * qz;
        var wx = qw * qx, wy = qw * qy, wz = qw * qz;
        return [
            [1 - 2 * (yy + zz), 2 * (xy - wz),     2 * (xz + wy)    ],
            [2 * (xy + wz),     1 - 2 * (xx + zz),  2 * (yz - wx)    ],
            [2 * (xz - wy),     2 * (yz + wx),       1 - 2 * (xx + yy)]
        ];
    }

    _quatToEulerYXZ(q) {
        // Three.js 'YXZ' intrinsic: R = Ry(yaw) * Rx(pitch) * Rz(roll)
        var qx = q[0], qy = q[1], qz = q[2], qw = q[3];
        var sinP = 2 * (qx * qw - qy * qz);
        var pitch;
        if (sinP >= 1) pitch = Math.PI / 2;
        else if (sinP <= -1) pitch = -Math.PI / 2;
        else pitch = Math.asin(sinP);

        var yaw = Math.atan2(2 * (qx * qz + qy * qw), 1 - 2 * (qx * qx + qy * qy));
        var roll = Math.atan2(2 * (qx * qy + qz * qw), 1 - 2 * (qx * qx + qz * qz));
        return [pitch, yaw, roll];
    }

    _eulerToQuatYXZ(pitch, yaw, roll) {
        var sx = Math.sin(pitch * 0.5), cx = Math.cos(pitch * 0.5);
        var sy = Math.sin(yaw * 0.5),   cy = Math.cos(yaw * 0.5);
        var sz = Math.sin(roll * 0.5),   cz = Math.cos(roll * 0.5);
        return [
            cy * sx * cz + sy * cx * sz,
           -cy * sx * sz + sy * cx * cz,
            cy * cx * sz - sy * sx * cz,
            cy * cx * cz + sy * sx * sz
        ];
    }

    // ================================================================
    //  행렬 연산 (3x3)
    // ================================================================
    _mat3Mul(A, B) {
        return [
            [A[0][0]*B[0][0]+A[0][1]*B[1][0]+A[0][2]*B[2][0], A[0][0]*B[0][1]+A[0][1]*B[1][1]+A[0][2]*B[2][1], A[0][0]*B[0][2]+A[0][1]*B[1][2]+A[0][2]*B[2][2]],
            [A[1][0]*B[0][0]+A[1][1]*B[1][0]+A[1][2]*B[2][0], A[1][0]*B[0][1]+A[1][1]*B[1][1]+A[1][2]*B[2][1], A[1][0]*B[0][2]+A[1][1]*B[1][2]+A[1][2]*B[2][2]],
            [A[2][0]*B[0][0]+A[2][1]*B[1][0]+A[2][2]*B[2][0], A[2][0]*B[0][1]+A[2][1]*B[1][1]+A[2][2]*B[2][1], A[2][0]*B[0][2]+A[2][1]*B[1][2]+A[2][2]*B[2][2]]
        ];
    }

    _mat3T(M) {
        return [
            [M[0][0], M[1][0], M[2][0]],
            [M[0][1], M[1][1], M[2][1]],
            [M[0][2], M[1][2], M[2][2]]
        ];
    }

    // ================================================================
    //  유틸리티
    // ================================================================
    _clamp(value, min, max) {
        if (value < min) return min;
        if (value > max) return max;
        return value;
    }
}

// 전역 네임스페이스에 등록
window.DroneSim = window.DroneSim || {};
window.DroneSim.DronePhysics = DronePhysics;
