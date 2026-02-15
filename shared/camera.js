/**
 * 카메라 시스템
 * 3인칭 추적, FPV 1인칭, 자유 시점 카메라를 지원합니다.
 */
class CameraSystem {
    constructor(camera) {
        this.camera = camera;
        this.mode = 'third-person';
        this.target = null;

        // 3인칭 설정
        this.thirdPerson = {
            distance: 5,
            height: 3,
            smoothing: 5,
            lookAheadDistance: 2
        };

        // FPV 설정
        this.fpv = {
            offsetY: 0.05,
            offsetZ: -0.15
        };

        // 현재 카메라 위치 (스무딩용)
        this._currentPos = { x: 0, y: 5, z: 8 };
        this._currentLookAt = { x: 0, y: 0, z: 0 };
    }

    setTarget(target) {
        this.target = target;
    }

    setMode(mode) {
        this.mode = mode;
    }

    nextMode() {
        const modes = ['third-person', 'fpv', 'free'];
        const idx = modes.indexOf(this.mode);
        this.mode = modes[(idx + 1) % modes.length];
        return this.mode;
    }

    update(dt) {
        if (!this.target) return;

        const dronePos = this.target.position;
        const droneRot = this.target.rotation;

        switch (this.mode) {
            case 'third-person':
                this._updateThirdPerson(dt, dronePos, droneRot);
                break;
            case 'fpv':
                this._updateFPV(dt, dronePos, droneRot);
                break;
            case 'free':
                // 자유 카메라는 OrbitControls 사용 (별도 설정)
                break;
        }
    }

    _updateThirdPerson(dt, dronePos, droneRot) {
        const cfg = this.thirdPerson;
        const smoothing = cfg.smoothing * dt;

        // 드론 뒤쪽 + 위쪽에 카메라 위치
        const yaw = droneRot.y || 0;
        const targetX = dronePos.x + Math.sin(yaw) * cfg.distance;
        const targetY = dronePos.y + cfg.height;
        const targetZ = dronePos.z + Math.cos(yaw) * cfg.distance;

        // 부드러운 이동
        this._currentPos.x += (targetX - this._currentPos.x) * Math.min(smoothing, 1);
        this._currentPos.y += (targetY - this._currentPos.y) * Math.min(smoothing, 1);
        this._currentPos.z += (targetZ - this._currentPos.z) * Math.min(smoothing, 1);

        // 카메라가 바라보는 점 (드론 약간 앞)
        const lookX = dronePos.x - Math.sin(yaw) * cfg.lookAheadDistance;
        const lookY = dronePos.y;
        const lookZ = dronePos.z - Math.cos(yaw) * cfg.lookAheadDistance;

        this._currentLookAt.x += (lookX - this._currentLookAt.x) * Math.min(smoothing, 1);
        this._currentLookAt.y += (lookY - this._currentLookAt.y) * Math.min(smoothing, 1);
        this._currentLookAt.z += (lookZ - this._currentLookAt.z) * Math.min(smoothing, 1);

        this.camera.position.set(this._currentPos.x, this._currentPos.y, this._currentPos.z);
        this.camera.lookAt(this._currentLookAt.x, this._currentLookAt.y, this._currentLookAt.z);
    }

    _updateFPV(dt, dronePos, droneRot) {
        const cfg = this.fpv;
        const yaw = droneRot.y || 0;

        // 드론 위치에서 약간 위/앞에 카메라 배치
        this.camera.position.set(
            dronePos.x,
            dronePos.y + cfg.offsetY,
            dronePos.z
        );

        // 드론이 바라보는 방향으로 카메라 방향 설정
        const lookDistance = 10;
        const lookX = dronePos.x - Math.sin(yaw) * lookDistance;
        const lookY = dronePos.y + cfg.offsetY - Math.sin(droneRot.x || 0) * lookDistance;
        const lookZ = dronePos.z - Math.cos(yaw) * lookDistance;

        this.camera.lookAt(lookX, lookY, lookZ);
    }

    /**
     * 카메라 모드 한국어 이름
     */
    getModeName() {
        const names = {
            'third-person': '3인칭',
            'fpv': '1인칭 (FPV)',
            'free': '자유 시점'
        };
        return names[this.mode] || this.mode;
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.CameraSystem = CameraSystem;
