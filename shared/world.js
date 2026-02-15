/**
 * 3D 월드 생성기
 * 하늘, 바닥, 건물, 나무 등 시뮬레이터 환경을 구성합니다.
 */
class World {
    constructor(scene) {
        this.scene = scene;
        this.objects = [];
        this.obstacles = [];
        this.rings = [];
        this.landingPads = [];
        this.waypoints = [];
    }

    /**
     * 전체 월드 생성
     */
    create() {
        this.createSky();
        this.createGround();
        this.createLighting();
        this.createBuildings();
        this.createTrees();
        this.createRingGates();
        this.createLandingPads();
        this.createBoundaryWalls();
    }

    createSky() {
        // 그라디언트 하늘 배경
        const canvas = document.createElement('canvas');
        canvas.width = 2;
        canvas.height = 512;
        const ctx = canvas.getContext('2d');
        const gradient = ctx.createLinearGradient(0, 0, 0, 512);
        gradient.addColorStop(0, '#1e3a5f');
        gradient.addColorStop(0.3, '#4a90d9');
        gradient.addColorStop(0.6, '#87ceeb');
        gradient.addColorStop(1, '#b0e0e6');
        ctx.fillStyle = gradient;
        ctx.fillRect(0, 0, 2, 512);

        const skyTexture = new THREE.CanvasTexture(canvas);
        const skyGeo = new THREE.SphereGeometry(200, 32, 32);
        const skyMat = new THREE.MeshBasicMaterial({
            map: skyTexture,
            side: THREE.BackSide
        });
        const sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);

        // 구름
        this._createClouds();
    }

    _createClouds() {
        const cloudMat = new THREE.MeshBasicMaterial({
            color: 0xffffff,
            transparent: true,
            opacity: 0.8
        });

        for (let i = 0; i < 15; i++) {
            const cloudGroup = new THREE.Group();
            const numPuffs = 3 + Math.floor(Math.random() * 4);

            for (let j = 0; j < numPuffs; j++) {
                const size = 1.5 + Math.random() * 2;
                const puffGeo = new THREE.SphereGeometry(size, 8, 6);
                const puff = new THREE.Mesh(puffGeo, cloudMat);
                puff.position.set(
                    (Math.random() - 0.5) * 3,
                    (Math.random() - 0.5) * 0.8,
                    (Math.random() - 0.5) * 2
                );
                puff.scale.y = 0.5;
                cloudGroup.add(puff);
            }

            cloudGroup.position.set(
                (Math.random() - 0.5) * 150,
                25 + Math.random() * 20,
                (Math.random() - 0.5) * 150
            );
            this.scene.add(cloudGroup);
        }
    }

    createGround() {
        // 잔디 바닥
        const groundGeo = new THREE.PlaneGeometry(200, 200);
        const groundMat = new THREE.MeshPhongMaterial({
            color: 0x4a8c3f,
            side: THREE.DoubleSide
        });
        const ground = new THREE.Mesh(groundGeo, groundMat);
        ground.rotation.x = -Math.PI / 2;
        ground.position.y = -0.01;
        this.scene.add(ground);

        // 격자 무늬 (고도 인식 보조)
        const gridHelper = new THREE.GridHelper(200, 40, 0x3a7a30, 0x3a7a30);
        gridHelper.material.transparent = true;
        gridHelper.material.opacity = 0.3;
        this.scene.add(gridHelper);
    }

    createLighting() {
        // 환경광
        const ambient = new THREE.AmbientLight(0x6688aa, 0.6);
        this.scene.add(ambient);

        // 태양광 (방향성)
        const sun = new THREE.DirectionalLight(0xffffcc, 1.0);
        sun.position.set(30, 50, 20);
        sun.castShadow = false;
        this.scene.add(sun);

        // 보조광
        const fill = new THREE.DirectionalLight(0x8899aa, 0.3);
        fill.position.set(-20, 30, -10);
        this.scene.add(fill);
    }

    createBuildings() {
        const buildingData = [
            { x: 15, z: 15, w: 3, h: 8, d: 3, color: 0x8899aa },
            { x: -20, z: 10, w: 4, h: 12, d: 4, color: 0x7788aa },
            { x: 25, z: -15, w: 5, h: 6, d: 3, color: 0x99aabb },
            { x: -15, z: -20, w: 3, h: 10, d: 5, color: 0x8899aa },
            { x: 30, z: 25, w: 4, h: 15, d: 4, color: 0x6677aa },
            { x: -30, z: -10, w: 6, h: 5, d: 4, color: 0xaabbcc },
            { x: -5, z: -30, w: 3, h: 7, d: 3, color: 0x99aacc },
            { x: 35, z: 10, w: 4, h: 9, d: 4, color: 0x7799bb },
            { x: 10, z: -25, w: 5, h: 4, d: 3, color: 0x88aacc },
        ];

        buildingData.forEach(b => {
            const geo = new THREE.BoxGeometry(b.w, b.h, b.d);
            const mat = new THREE.MeshPhongMaterial({ color: b.color });
            const mesh = new THREE.Mesh(geo, mat);
            mesh.position.set(b.x, b.h / 2, b.z);

            // Mark as obstacle for sensor system
            mesh.userData.isObstacle = true;

            this.scene.add(mesh);
            this.objects.push(mesh);
            this.obstacles.push(mesh);

            // 창문 효과
            this._addWindows(mesh, b);
        });
    }

    _addWindows(building, data) {
        const windowMat = new THREE.MeshBasicMaterial({
            color: 0xffffcc,
            transparent: true,
            opacity: 0.6
        });

        const floors = Math.floor(data.h / 2);
        for (let f = 0; f < floors; f++) {
            const y = f * 2 + 1 - data.h / 2;
            for (let side = 0; side < 4; side++) {
                const winGeo = new THREE.PlaneGeometry(0.6, 0.8);
                const win = new THREE.Mesh(winGeo, windowMat);

                switch (side) {
                    case 0:
                        win.position.set(0, y, data.d / 2 + 0.01);
                        break;
                    case 1:
                        win.position.set(0, y, -data.d / 2 - 0.01);
                        win.rotation.y = Math.PI;
                        break;
                    case 2:
                        win.position.set(data.w / 2 + 0.01, y, 0);
                        win.rotation.y = Math.PI / 2;
                        break;
                    case 3:
                        win.position.set(-data.w / 2 - 0.01, y, 0);
                        win.rotation.y = -Math.PI / 2;
                        break;
                }
                building.add(win);
            }
        }
    }

    createTrees() {
        const treePositions = [
            { x: 8, z: -5 }, { x: -8, z: 8 }, { x: 12, z: 20 },
            { x: -25, z: 5 }, { x: 5, z: -25 }, { x: -10, z: -15 },
            { x: 20, z: 5 }, { x: -5, z: 25 }, { x: 35, z: -5 },
            { x: -35, z: 15 }, { x: 18, z: -30 }, { x: -18, z: -28 }
        ];

        treePositions.forEach(pos => {
            const tree = this._createTree();
            tree.position.set(pos.x, 0, pos.z);
            const scale = 0.7 + Math.random() * 0.6;
            tree.scale.set(scale, scale, scale);
            this.scene.add(tree);
            this.objects.push(tree);
        });
    }

    _createTree() {
        const group = new THREE.Group();

        // 줄기
        const trunkGeo = new THREE.CylinderGeometry(0.15, 0.2, 2, 6);
        const trunkMat = new THREE.MeshPhongMaterial({ color: 0x8B4513 });
        const trunk = new THREE.Mesh(trunkGeo, trunkMat);
        trunk.position.y = 1;
        group.add(trunk);

        // 나뭇잎 (3단 원뿔)
        const leafColors = [0x228B22, 0x2d8f2d, 0x1a7a1a];
        for (let i = 0; i < 3; i++) {
            const radius = 1.5 - i * 0.35;
            const height = 1.5 - i * 0.2;
            const leafGeo = new THREE.ConeGeometry(radius, height, 8);
            const leafMat = new THREE.MeshPhongMaterial({ color: leafColors[i] });
            const leaf = new THREE.Mesh(leafGeo, leafMat);
            leaf.position.y = 2.2 + i * 1.0;
            group.add(leaf);
        }

        return group;
    }

    createLandingPads() {
        // Multiple landing pads at different locations
        const padData = [
            { x: 0, z: 0, color: 0xff6600, label: 'H' },      // Orange center pad
            { x: -35, z: 30, color: 0x00ff00, label: 'A' },   // Green pad
            { x: 35, z: -30, color: 0x0088ff, label: 'B' },   // Blue pad
            { x: 40, z: 35, color: 0xffff00, label: 'C' },    // Yellow pad
        ];

        padData.forEach(data => {
            this._createSingleLandingPad(data.x, data.z, data.color, data.label);
        });
    }

    _createSingleLandingPad(x, z, color, label) {
        // Landing pad cylinder
        const padGeo = new THREE.CylinderGeometry(1.5, 1.5, 0.05, 32);
        const padMat = new THREE.MeshPhongMaterial({ color: 0xcccccc });
        const pad = new THREE.Mesh(padGeo, padMat);
        pad.position.set(x, 0.025, z);
        pad.userData.isLandingPad = true;
        pad.userData.padLabel = label;
        this.scene.add(pad);
        this.landingPads.push(pad);

        // Label mark
        const labelMat = new THREE.MeshBasicMaterial({ color: color });

        if (label === 'H') {
            // H의 세로선 2개
            const vBarGeo = new THREE.PlaneGeometry(0.15, 0.8);
            [-0.25, 0.25].forEach(xOffset => {
                const bar = new THREE.Mesh(vBarGeo, labelMat);
                bar.rotation.x = -Math.PI / 2;
                bar.position.set(x + xOffset, 0.06, z);
                this.scene.add(bar);
            });

            // H의 가로선
            const hBarGeo = new THREE.PlaneGeometry(0.5, 0.15);
            const hBar = new THREE.Mesh(hBarGeo, labelMat);
            hBar.rotation.x = -Math.PI / 2;
            hBar.position.set(x, 0.06, z);
            this.scene.add(hBar);
        } else {
            // Simple circle marker for other pads
            const markerGeo = new THREE.CircleGeometry(0.5, 32);
            const marker = new THREE.Mesh(markerGeo, labelMat);
            marker.rotation.x = -Math.PI / 2;
            marker.position.set(x, 0.06, z);
            this.scene.add(marker);
        }

        // Border ring
        const ringGeo = new THREE.RingGeometry(1.4, 1.5, 32);
        const ringMat = new THREE.MeshBasicMaterial({
            color: color,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.set(x, 0.06, z);
        this.scene.add(ring);
    }

    createBoundaryWalls() {
        // Visible boundary walls so students know the flight area
        const boundary = 50;
        const wallHeight = 0.5;
        const wallThickness = 0.2;

        // Semi-transparent red material for walls
        const wallMat = new THREE.MeshPhongMaterial({
            color: 0xff4444,
            transparent: true,
            opacity: 0.3,
            side: THREE.DoubleSide
        });

        // Four walls (North, South, East, West)
        const walls = [
            // North wall
            { w: boundary * 2, h: wallHeight, d: wallThickness, x: 0, z: boundary },
            // South wall
            { w: boundary * 2, h: wallHeight, d: wallThickness, x: 0, z: -boundary },
            // East wall
            { w: wallThickness, h: wallHeight, d: boundary * 2, x: boundary, z: 0 },
            // West wall
            { w: wallThickness, h: wallHeight, d: boundary * 2, x: -boundary, z: 0 }
        ];

        walls.forEach(wall => {
            const geo = new THREE.BoxGeometry(wall.w, wall.h, wall.d);
            const mesh = new THREE.Mesh(geo, wallMat);
            mesh.position.set(wall.x, wall.h / 2, wall.z);
            mesh.userData.isObstacle = true;
            this.scene.add(mesh);
            this.obstacles.push(mesh);
        });

        // Corner poles with flags
        const poleMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
        const poleGeo = new THREE.CylinderGeometry(0.1, 0.1, 5, 6);

        [
            { x: boundary, z: boundary },
            { x: -boundary, z: boundary },
            { x: boundary, z: -boundary },
            { x: -boundary, z: -boundary }
        ].forEach(pos => {
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(pos.x, 2.5, pos.z);
            this.scene.add(pole);

            // Flag
            const flagGeo = new THREE.PlaneGeometry(1.5, 0.8);
            const flagMat = new THREE.MeshBasicMaterial({
                color: 0xff4444,
                side: THREE.DoubleSide,
                transparent: true,
                opacity: 0.8
            });
            const flag = new THREE.Mesh(flagGeo, flagMat);
            flag.position.set(pos.x + 0.75, 4.5, pos.z);
            this.scene.add(flag);
        });
    }

    createRingGates() {
        // Floating ring gates for waypoint missions
        const ringData = [
            { x: 10, y: 5, z: -10, color: 0xff00ff, id: 1, rotation: 0 },           // Magenta
            { x: -15, y: 7, z: 20, color: 0x00ffff, id: 2, rotation: Math.PI / 4 }, // Cyan
            { x: 20, y: 4, z: 20, color: 0xffff00, id: 3, rotation: 0 },            // Yellow
            { x: -25, y: 6, z: -15, color: 0xff6600, id: 4, rotation: -Math.PI / 6 }, // Orange
            { x: 30, y: 8, z: 0, color: 0x00ff00, id: 5, rotation: Math.PI / 2 },   // Green
        ];

        ringData.forEach(data => {
            const ringGeo = new THREE.TorusGeometry(2, 0.15, 16, 32);
            const ringMat = new THREE.MeshPhongMaterial({
                color: data.color,
                emissive: data.color,
                emissiveIntensity: 0.3
            });
            const ring = new THREE.Mesh(ringGeo, ringMat);
            ring.position.set(data.x, data.y, data.z);
            ring.rotation.y = data.rotation;

            // Mark as ring for mission system
            ring.userData.isRing = true;
            ring.userData.ringId = data.id;

            this.scene.add(ring);
            this.rings.push(ring);

            // Add support pole
            const poleGeo = new THREE.CylinderGeometry(0.08, 0.08, data.y, 8);
            const poleMat = new THREE.MeshPhongMaterial({ color: 0x888888 });
            const pole = new THREE.Mesh(poleGeo, poleMat);
            pole.position.set(data.x, data.y / 2, data.z);
            this.scene.add(pole);
        });
    }

    /**
     * 장애물 목록 (충돌 감지용)
     */
    getObstacles() {
        return this.obstacles;
    }

    /**
     * Get all ring gates
     */
    getRings() {
        return this.rings;
    }

    /**
     * Dynamically place a waypoint marker in the scene
     */
    placeWaypoint(x, y, z, color = 0xff0000) {
        const waypointGroup = new THREE.Group();

        // Sphere marker
        const sphereGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const sphereMat = new THREE.MeshPhongMaterial({
            color: color,
            emissive: color,
            emissiveIntensity: 0.4
        });
        const sphere = new THREE.Mesh(sphereGeo, sphereMat);
        waypointGroup.add(sphere);

        // Vertical line indicator
        const lineGeo = new THREE.CylinderGeometry(0.05, 0.05, y > 0 ? y : 0.1, 8);
        const lineMat = new THREE.MeshBasicMaterial({
            color: color,
            transparent: true,
            opacity: 0.5
        });
        const line = new THREE.Mesh(lineGeo, lineMat);
        line.position.y = -(y > 0 ? y / 2 : 0.05);
        waypointGroup.add(line);

        waypointGroup.position.set(x, y, z);
        waypointGroup.userData.isWaypoint = true;

        this.scene.add(waypointGroup);
        this.waypoints.push(waypointGroup);

        return waypointGroup;
    }

    /**
     * Remove all dynamic waypoints from the scene
     */
    clearWaypoints() {
        this.waypoints.forEach(waypoint => {
            this.scene.remove(waypoint);
        });
        this.waypoints = [];
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.World = World;
