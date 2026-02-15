/**
 * 드론 3D 모델 생성기
 * Three.js 기하 도형으로 쿼드콥터를 만듭니다.
 */
class DroneModel {
    constructor() {
        this.group = new THREE.Group();
        this.propellers = [];
        this.propellerSpeed = 0;
        this.leds = [];
        this._build();
    }

    _build() {
        // 본체 (중앙 박스)
        const bodyGeo = new THREE.BoxGeometry(0.3, 0.08, 0.3);
        const bodyMat = new THREE.MeshPhongMaterial({ color: 0x333333 });
        const body = new THREE.Mesh(bodyGeo, bodyMat);
        this.group.add(body);

        // 상단 커버 (둥근 느낌)
        const topGeo = new THREE.CylinderGeometry(0.12, 0.15, 0.05, 8);
        const topMat = new THREE.MeshPhongMaterial({ color: 0x444444 });
        const top = new THREE.Mesh(topGeo, topMat);
        top.position.y = 0.06;
        this.group.add(top);

        // 카메라 표시 (앞쪽)
        const camGeo = new THREE.SphereGeometry(0.025, 8, 8);
        const camMat = new THREE.MeshPhongMaterial({ color: 0x111111 });
        const cam = new THREE.Mesh(camGeo, camMat);
        cam.position.set(0, 0, -0.17);
        this.group.add(cam);

        // 팔 4개 + 모터 + 프로펠러
        const armPositions = [
            { x: 0.22, z: 0.22, front: false },
            { x: -0.22, z: 0.22, front: false },
            { x: 0.22, z: -0.22, front: true },
            { x: -0.22, z: -0.22, front: true }
        ];

        armPositions.forEach((pos, i) => {
            // 팔
            const armGeo = new THREE.BoxGeometry(0.04, 0.03, 0.04);
            const armMat = new THREE.MeshPhongMaterial({ color: 0x555555 });

            const armLength = Math.sqrt(pos.x ** 2 + pos.z ** 2);
            const armStretchGeo = new THREE.BoxGeometry(armLength, 0.02, 0.03);
            const armStretch = new THREE.Mesh(armStretchGeo, armMat);
            armStretch.position.set(pos.x / 2, 0, pos.z / 2);
            armStretch.rotation.y = Math.atan2(pos.x, pos.z);
            this.group.add(armStretch);

            // 모터 (원통)
            const motorGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.04, 8);
            const motorMat = new THREE.MeshPhongMaterial({ color: 0x222222 });
            const motor = new THREE.Mesh(motorGeo, motorMat);
            motor.position.set(pos.x, 0.03, pos.z);
            this.group.add(motor);

            // 프로펠러
            const propGroup = new THREE.Group();
            propGroup.position.set(pos.x, 0.06, pos.z);

            const bladeGeo = new THREE.BoxGeometry(0.18, 0.005, 0.02);
            const bladeMat = new THREE.MeshPhongMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0.7
            });

            const blade1 = new THREE.Mesh(bladeGeo, bladeMat);
            const blade2 = new THREE.Mesh(bladeGeo, bladeMat);
            blade2.rotation.y = Math.PI / 2;

            propGroup.add(blade1);
            propGroup.add(blade2);

            // 프로펠러 회전 디스크 (빠를 때 보이는 원반 효과)
            const discGeo = new THREE.CircleGeometry(0.09, 16);
            const discMat = new THREE.MeshPhongMaterial({
                color: 0x88ccff,
                transparent: true,
                opacity: 0,
                side: THREE.DoubleSide
            });
            const disc = new THREE.Mesh(discGeo, discMat);
            disc.rotation.x = -Math.PI / 2;
            propGroup.add(disc);
            propGroup.userData.disc = disc;

            this.group.add(propGroup);
            this.propellers.push(propGroup);

            // LED (앞쪽: 초록, 뒤쪽: 빨강)
            const ledGeo = new THREE.SphereGeometry(0.015, 6, 6);
            const ledColor = pos.front ? 0x00ff00 : 0xff0000;
            const ledMat = new THREE.MeshBasicMaterial({ color: ledColor });
            const led = new THREE.Mesh(ledGeo, ledMat);
            led.position.set(pos.x, -0.03, pos.z);
            this.group.add(led);
            this.leds.push(led);
        });

        // 착륙 다리
        const legGeo = new THREE.CylinderGeometry(0.008, 0.008, 0.08, 4);
        const legMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        const legPositions = [
            { x: 0.12, z: 0.1 }, { x: -0.12, z: 0.1 },
            { x: 0.12, z: -0.1 }, { x: -0.12, z: -0.1 }
        ];
        legPositions.forEach(pos => {
            const leg = new THREE.Mesh(legGeo, legMat);
            leg.position.set(pos.x, -0.06, pos.z);
            this.group.add(leg);
        });

        // 하단 바 (착륙 스키드)
        const skidGeo = new THREE.BoxGeometry(0.005, 0.005, 0.22);
        const skidMat = new THREE.MeshPhongMaterial({ color: 0x666666 });
        [-0.12, 0.12].forEach(x => {
            const skid = new THREE.Mesh(skidGeo, skidMat);
            skid.position.set(x, -0.1, 0);
            this.group.add(skid);
        });
    }

    /**
     * 프로펠러 회전 업데이트
     */
    updatePropellers(dt, throttle = 0) {
        const targetSpeed = this.group.userData.isFlying ? (30 + Math.abs(throttle) * 20) : 0;
        this.propellerSpeed += (targetSpeed - this.propellerSpeed) * dt * 5;

        this.propellers.forEach((prop, i) => {
            const direction = (i % 2 === 0) ? 1 : -1;
            prop.rotation.y += this.propellerSpeed * direction * dt;

            // 빠른 회전 시 디스크 효과
            const disc = prop.userData.disc;
            if (disc) {
                disc.material.opacity = Math.min(this.propellerSpeed / 40, 0.3);
            }
        });
    }

    /**
     * 물리 상태를 3D 모델에 동기화
     */
    updateFromPhysics(state) {
        this.group.position.set(state.position.x, state.position.y, state.position.z);
        this.group.rotation.set(state.rotation.pitch, state.rotation.yaw, state.rotation.roll, 'YXZ');
        this.group.userData.isFlying = state.isFlying;
    }

    /**
     * 드론 모델 가져오기
     */
    getModel() {
        return this.group;
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.DroneModel = DroneModel;
