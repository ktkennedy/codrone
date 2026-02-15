/**
 * 드론 물리 엔진
 * 중력, 양력, 공기저항, 자동안정화를 시뮬레이션합니다.
 */
class DronePhysics {
    constructor(config = {}) {
        this.gravity = config.gravity || 9.8;
        this.mass = config.mass || 0.5;
        this.maxThrust = config.maxThrust || 12;
        this.dragCoefficient = config.dragCoefficient || 0.3;
        this.maxSpeed = config.maxSpeed || config.speedLimit || 15;
        this.maxTiltAngle = config.maxTiltAngle || Math.PI / 6;
        this.autoStabilize = config.autoStabilize !== undefined ? config.autoStabilize : true;
        this.stabilizeRate = config.stabilizeRate || 3.0;
        this.speedLimit = config.speedLimit || this.maxSpeed;

        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, roll: 0, yaw: 0 };
        this.angularVelocity = { pitch: 0, roll: 0, yaw: 0 };

        this.isFlying = false;
        this.isLanding = false;
        this.battery = 100;
        this.batteryDrainRate = config.batteryDrainRate || 0.5;
        this.groundLevel = 0;

        this.onCollision = null;
        this.onLanded = null;
    }

    reset() {
        this.position = { x: 0, y: 0, z: 0 };
        this.velocity = { x: 0, y: 0, z: 0 };
        this.rotation = { pitch: 0, roll: 0, yaw: 0 };
        this.angularVelocity = { pitch: 0, roll: 0, yaw: 0 };
        this.isFlying = false;
        this.isLanding = false;
        this.battery = 100;
    }

    takeoff(targetHeight = 2) {
        if (this.isFlying) return;
        this.isFlying = true;
        this.isLanding = false;
        this._takeoffTarget = targetHeight;
        this._takeoffPhase = true;
    }

    land() {
        if (!this.isFlying) return;
        this.isLanding = true;
    }

    /**
     * 메인 물리 업데이트
     * @param {number} dt - 델타 타임 (초)
     * @param {Object} input - 조작 입력 { throttle, pitch, roll, yaw } 각각 -1 ~ 1
     */
    update(dt, input = {}) {
        if (!this.isFlying && !this._takeoffPhase) return this.getState();

        dt = Math.min(dt, 0.05);

        const throttle = this._clamp(input.throttle || 0, -1, 1);
        const pitchInput = this._clamp(input.pitch || 0, -1, 1);
        const rollInput = this._clamp(input.roll || 0, -1, 1);
        const yawInput = this._clamp(input.yaw || 0, -1, 1);

        // 자동 이륙 처리
        if (this._takeoffPhase) {
            this.velocity.y = 2.0;
            if (this.position.y >= (this._takeoffTarget || 2)) {
                this._takeoffPhase = false;
                this.velocity.y = 0;
            }
        }
        // 자동 착륙 처리
        else if (this.isLanding) {
            this.velocity.y = -1.0;
            if (this.position.y <= this.groundLevel + 0.05) {
                this.position.y = this.groundLevel;
                this.velocity = { x: 0, y: 0, z: 0 };
                this.rotation = { pitch: 0, roll: 0, yaw: this.rotation.yaw };
                this.isFlying = false;
                this.isLanding = false;
                if (this.onLanded) this.onLanded();
                return this.getState();
            }
        }
        else {
            // 수직 추력 (스로틀)
            const thrustForce = (throttle * this.maxThrust);
            const gravityForce = -this.gravity;
            this.velocity.y += (thrustForce + gravityForce) * dt;

            // 회전 업데이트
            const tiltSpeed = 2.5;
            this.rotation.pitch += pitchInput * tiltSpeed * dt;
            this.rotation.roll += rollInput * tiltSpeed * dt;
            this.rotation.yaw += yawInput * 2.0 * dt;

            // 최대 기울기 제한
            this.rotation.pitch = this._clamp(this.rotation.pitch, -this.maxTiltAngle, this.maxTiltAngle);
            this.rotation.roll = this._clamp(this.rotation.roll, -this.maxTiltAngle, this.maxTiltAngle);

            // 자동 안정화
            if (this.autoStabilize) {
                if (Math.abs(pitchInput) < 0.1) {
                    this.rotation.pitch *= (1 - this.stabilizeRate * dt);
                }
                if (Math.abs(rollInput) < 0.1) {
                    this.rotation.roll *= (1 - this.stabilizeRate * dt);
                }
                // 호버링 안정화 (입력 없으면 수직 속도 감소)
                if (Math.abs(throttle) < 0.1) {
                    this.velocity.y *= (1 - 2.0 * dt);
                }
            }

            // 기울기에 따른 수평 이동
            const yawCos = Math.cos(this.rotation.yaw);
            const yawSin = Math.sin(this.rotation.yaw);

            const forwardForce = -Math.sin(this.rotation.pitch) * this.maxThrust * 0.5;
            const rightForce = -Math.sin(this.rotation.roll) * this.maxThrust * 0.5;

            this.velocity.x += (forwardForce * yawSin + rightForce * yawCos) * dt;
            this.velocity.z += (forwardForce * yawCos - rightForce * yawSin) * dt;
        }

        // 공기 저항
        this.velocity.x *= (1 - this.dragCoefficient * dt);
        this.velocity.z *= (1 - this.dragCoefficient * dt);

        // 속도 제한
        const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        if (hSpeed > this.speedLimit) {
            const scale = this.speedLimit / hSpeed;
            this.velocity.x *= scale;
            this.velocity.z *= scale;
        }
        this.velocity.y = this._clamp(this.velocity.y, -this.speedLimit, this.speedLimit);

        // 위치 업데이트
        this.position.x += this.velocity.x * dt;
        this.position.y += this.velocity.y * dt;
        this.position.z += this.velocity.z * dt;

        // 지면 충돌
        if (this.position.y < this.groundLevel) {
            this.position.y = this.groundLevel;
            const impactSpeed = Math.abs(this.velocity.y);
            this.velocity.y = 0;

            if (impactSpeed > 3) {
                if (this.onCollision) this.onCollision(impactSpeed);
                this.velocity.x *= 0.5;
                this.velocity.z *= 0.5;
            }
        }

        // 높이 제한 (최대 50m)
        if (this.position.y > 50) {
            this.position.y = 50;
            this.velocity.y = Math.min(this.velocity.y, 0);
        }

        // 배터리 소모
        if (this.isFlying) {
            this.battery -= this.batteryDrainRate * dt;
            if (this.battery <= 0) {
                this.battery = 0;
                this.land();
            }
        }

        return this.getState();
    }

    getState() {
        const hSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.z ** 2);
        const totalSpeed = Math.sqrt(this.velocity.x ** 2 + this.velocity.y ** 2 + this.velocity.z ** 2);
        let heading = (this.rotation.yaw * 180 / Math.PI) % 360;
        if (heading < 0) heading += 360;

        return {
            position: { ...this.position },
            velocity: { ...this.velocity },
            rotation: { ...this.rotation },
            altitude: this.position.y,
            speed: totalSpeed,
            horizontalSpeed: hSpeed,
            verticalSpeed: this.velocity.y,
            heading: heading,
            battery: this.battery,
            isFlying: this.isFlying,
            isLanding: this.isLanding
        };
    }

    _clamp(value, min, max) {
        return Math.max(min, Math.min(max, value));
    }
}

// 전역 네임스페이스에 등록
window.DroneSim = window.DroneSim || {};
window.DroneSim.DronePhysics = DronePhysics;
