/**
 * 텍스트 코딩 미션 정의 (6개)
 * 프로그래밍 개념을 점진적으로 학습하는 교육용 미션
 */
(function () {
    'use strict';

    // 코드 에디터에서 패턴 확인
    function codeContains(pattern) {
        var el = document.getElementById('code-editor');
        if (!el) return false;
        return pattern.test(el.value);
    }

    // 3D 헬퍼
    function cleanupList(scene, list) {
        for (var i = 0; i < list.length; i++) {
            var obj = list[i];
            scene.remove(obj);
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) {
                if (obj.material.map) obj.material.map.dispose();
                obj.material.dispose();
            }
        }
    }

    function addSphere(scene, list, x, y, z, color, opacity) {
        var geo = new THREE.SphereGeometry(0.8, 16, 16);
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: opacity != null ? opacity : 0.7 });
        var m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        scene.add(m);
        list.push(m);
        return m;
    }

    function addBeam(scene, list, x, y, z, color) {
        var geo = new THREE.CylinderGeometry(0.04, 0.04, y, 8);
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.3 });
        var m = new THREE.Mesh(geo, mat);
        m.position.set(x, y / 2, z);
        scene.add(m);
        list.push(m);
        return m;
    }

    function addRing(scene, list, x, y, z, color, radius) {
        var geo = new THREE.TorusGeometry(radius || 4, 0.1, 16, 32);
        var mat = new THREE.MeshBasicMaterial({ color: color, transparent: true, opacity: 0.4 });
        var m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        m.rotation.x = Math.PI / 2;
        scene.add(m);
        list.push(m);
        return m;
    }

    function addLabel(scene, list, x, y, z, text, color) {
        var c = document.createElement('canvas');
        c.width = 128; c.height = 64;
        var ctx = c.getContext('2d');
        ctx.fillStyle = 'rgba(0,0,0,0.8)';
        ctx.fillRect(0, 0, 128, 64);
        ctx.fillStyle = color || '#fff';
        ctx.font = 'bold 20px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, 64, 32);
        var tex = new THREE.CanvasTexture(c);
        var mat = new THREE.SpriteMaterial({ map: tex, transparent: true });
        var s = new THREE.Sprite(mat);
        s.position.set(x, y, z);
        s.scale.set(3, 1.5, 1);
        scene.add(s);
        list.push(s);
        return s;
    }

    function addLine(scene, list, points, color) {
        var pts = [];
        for (var i = 0; i < points.length; i++) {
            pts.push(new THREE.Vector3(points[i].x, points[i].y, points[i].z));
        }
        var geo = new THREE.BufferGeometry().setFromPoints(pts);
        var mat = new THREE.LineBasicMaterial({ color: color || 0x00ccff, transparent: true, opacity: 0.5 });
        var line = new THREE.Line(geo, mat);
        scene.add(line);
        list.push(line);
        return line;
    }

    function dist3D(state, t) {
        var dx = state.position.x - t.x;
        var dy = state.position.y - t.y;
        var dz = state.position.z - t.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    function createCodingMissions() {
        return [
            // ====== 미션 1: 첫 프로그래밍 ======
            {
                name: '첫 프로그래밍',
                description: '명령을 순서대로 작성해 이륙, 이동, 착륙하세요!',
                hint: 'await drone.takeoff(); await drone.moveForward(10); await drone.land();',
                starterCode: '// 미션 1: 첫 프로그래밍\n// 명령을 순서대로 작성하세요!\n\nawait drone.takeoff();\n\n// TODO: 앞으로 10m 이동하세요\n\n\nawait drone.land();\n',
                timeLimit: 60,
                collectibles: [],
                _extraVisuals: [],
                _reachedForward: false,
                setup: function (scene) {
                    this._reachedForward = false;
                    this.collectibles = [];
                    this._extraVisuals = [];
                    addSphere(scene, this.collectibles, 0, 3, -10, 0x44ff88);
                    addBeam(scene, this.collectibles, 0, 3, -10, 0x44ff88);
                    addLabel(scene, this._extraVisuals, 0, 5.5, -10, '10m 앞', '#44ff88');
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (!this._reachedForward && state.position.z < -8) {
                        this._reachedForward = true;
                    }
                },
                objectives: [
                    { description: '이륙 (2m 이상)', check: function (s) { return s.altitude > 2; } },
                    { description: '앞으로 10m 이동', check: function (s, t, m) { return m._reachedForward; } },
                    { description: '안전하게 착륙', check: function (s, t, m) { return m._reachedForward && !s.isFlying && s.altitude < 0.3; } }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 40; },
                    threeStar: function (t) { return t < 25; }
                }
            },

            // ====== 미션 2: for 반복문 ======
            {
                name: 'for 반복문',
                description: 'for 반복문을 사용해 사각형으로 비행하세요! (for문 필수)',
                hint: 'for (let i = 0; i < 4; i++) { await drone.moveForward(8); await drone.turnRight(90); }',
                starterCode: '// 미션 2: for 반복문\n// for 반복문으로 사각형을 그리세요!\n\nawait drone.takeoff();\n\n// TODO: for 반복문으로 사각형 비행\n// for (let i = 0; i < 4; i++) {\n//   await drone.moveForward(8);\n//   await drone.turnRight(90);\n// }\n\n\nawait drone.land();\n',
                timeLimit: 120,
                collectibles: [],
                _extraVisuals: [],
                _currentWaypoint: 0,
                _targets: [
                    { x: 0, y: 3, z: -8 },
                    { x: 8, y: 3, z: -8 },
                    { x: 8, y: 3, z: 0 },
                    { x: 0, y: 3, z: 0 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentWaypoint = 0;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44];
                    var self = this;
                    this._targets.forEach(function (pos, i) {
                        addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], i === 0 ? 1.0 : 0.5);
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });
                    var pts = this._targets.concat([this._targets[0]]);
                    addLine(scene, this._extraVisuals, pts);
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (this._currentWaypoint >= this._targets.length) return;
                    var tgt = this._targets[this._currentWaypoint];
                    if (dist3D(state, tgt) < 3.5) {
                        if (this.collectibles[this._currentWaypoint * 2])
                            this.collectibles[this._currentWaypoint * 2].material.opacity = 0.15;
                        this._currentWaypoint++;
                        if (this._currentWaypoint < this._targets.length && this.collectibles[this._currentWaypoint * 2])
                            this.collectibles[this._currentWaypoint * 2].material.opacity = 1.0;
                    }
                },
                objectives: [
                    {
                        description: 'for 반복문 사용하기',
                        check: function () { return codeContains(/\bfor\s*\(/); }
                    },
                    {
                        description: '4개 모서리 모두 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 4; }
                    },
                    {
                        description: '사각형 완성 후 착륙',
                        check: function (s, t, m) { return m._currentWaypoint >= 4 && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 80; },
                    threeStar: function (t) { return t < 50; }
                }
            },

            // ====== 미션 3: 조건문 활용 ======
            {
                name: '조건문 활용',
                description: 'if/else 조건문과 센서로 3개 높이에 도달하세요! (if문 필수)',
                hint: 'if (drone.getAltitude() < 5) { await drone.moveUp(3); } 처럼 센서값으로 판단하세요.',
                starterCode: '// 미션 3: 조건문 활용\n// if/else와 센서로 높이를 조절하세요!\n\nawait drone.takeoff();\n\n// TODO: 조건문으로 높이 조절\n// let alt = drone.getAltitude();\n// console.log("현재 높이: " + alt);\n// if (alt < 5) {\n//   await drone.moveUp(3);\n// }\n\n\nawait drone.land();\n',
                timeLimit: 90,
                collectibles: [],
                _extraVisuals: [],
                _reached3m: false,
                _reached6m: false,
                _reached9m: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._reached3m = false;
                    this._reached6m = false;
                    this._reached9m = false;
                    var heights = [3, 6, 9];
                    var colors = [0x44ff44, 0xffaa00, 0xff4444];
                    for (var i = 0; i < 3; i++) {
                        addRing(scene, this.collectibles, 0, heights[i], 0, colors[i]);
                        addLabel(scene, this._extraVisuals, 5, heights[i], 0, heights[i] + 'm', '#' + ('000000' + colors[i].toString(16)).slice(-6));
                    }
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (!this._reached3m && state.altitude > 2.5 && state.altitude < 3.5) {
                        this._reached3m = true;
                        if (this.collectibles[0]) this.collectibles[0].material.opacity = 0.8;
                    }
                    if (!this._reached6m && state.altitude > 5.5 && state.altitude < 6.5) {
                        this._reached6m = true;
                        if (this.collectibles[1]) this.collectibles[1].material.opacity = 0.8;
                    }
                    if (!this._reached9m && state.altitude > 8.5 && state.altitude < 9.5) {
                        this._reached9m = true;
                        if (this.collectibles[2]) this.collectibles[2].material.opacity = 0.8;
                    }
                },
                objectives: [
                    {
                        description: 'if 조건문 사용하기',
                        check: function () { return codeContains(/\bif\s*\(/); }
                    },
                    {
                        description: '3m, 6m 높이 링 통과',
                        check: function (s, t, m) { return m._reached3m && m._reached6m; }
                    },
                    {
                        description: '9m 높이 링 통과 후 착륙',
                        check: function (s, t, m) { return m._reached9m && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 65; },
                    threeStar: function (t) { return t < 40; }
                }
            },

            // ====== 미션 4: 함수 만들기 ======
            {
                name: '함수 만들기',
                description: '나만의 함수를 정의하고 호출하세요! (function 정의 필수)',
                hint: 'async function myFly() { await drone.moveForward(5); } 처럼 함수를 만들고 await myFly(); 로 호출하세요.',
                starterCode: '// 미션 4: 함수 만들기\n// 나만의 비행 함수를 정의하고 호출하세요!\n\n// TODO: 함수 정의\n// async function flyAndTurn() {\n//   await drone.moveForward(5);\n//   await drone.turnRight(90);\n// }\n\nawait drone.takeoff();\n\n// TODO: 함수를 여러 번 호출해서 비행하세요\n\n\nawait drone.land();\n',
                timeLimit: 120,
                collectibles: [],
                _extraVisuals: [],
                _currentWaypoint: 0,
                _targets: [
                    { x: 0, y: 3, z: -5 },
                    { x: 5, y: 3, z: -5 },
                    { x: 5, y: 3, z: 0 },
                    { x: 0, y: 3, z: 0 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentWaypoint = 0;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44];
                    var self = this;
                    this._targets.forEach(function (pos, i) {
                        addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], i === 0 ? 1.0 : 0.5);
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });
                    var pts = this._targets.concat([this._targets[0]]);
                    addLine(scene, this._extraVisuals, pts);
                    addLabel(scene, this._extraVisuals, 2.5, 5, -2.5, '함수 사용!', '#bb88ff');
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (this._currentWaypoint >= this._targets.length) return;
                    var tgt = this._targets[this._currentWaypoint];
                    if (dist3D(state, tgt) < 3.5) {
                        if (this.collectibles[this._currentWaypoint * 2])
                            this.collectibles[this._currentWaypoint * 2].material.opacity = 0.15;
                        this._currentWaypoint++;
                        if (this._currentWaypoint < this._targets.length && this.collectibles[this._currentWaypoint * 2])
                            this.collectibles[this._currentWaypoint * 2].material.opacity = 1.0;
                    }
                },
                objectives: [
                    {
                        description: 'function 정의하기',
                        check: function () { return codeContains(/\bfunction\s+\w+/); }
                    },
                    {
                        description: '4개 지점 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 4; }
                    },
                    {
                        description: '모든 지점 방문 후 착륙',
                        check: function (s, t, m) { return m._currentWaypoint >= 4 && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 90; },
                    threeStar: function (t) { return t < 60; }
                }
            },

            // ====== 미션 5: 매개변수와 반환값 ======
            {
                name: '매개변수와 반환값',
                description: '매개변수가 있는 함수로 다양한 크기의 비행! (매개변수 함수 필수)',
                hint: 'async function flySquare(size) { for(...) { moveForward(size); turnRight(90); } } 처럼 크기를 매개변수로!',
                starterCode: '// 미션 5: 매개변수와 반환값\n// 매개변수를 받는 함수를 만들어보세요!\n\n// TODO: 매개변수가 있는 함수 정의\n// async function flySquare(size) {\n//   for (let i = 0; i < 4; i++) {\n//     await drone.moveForward(size);\n//     await drone.turnRight(90);\n//   }\n// }\n\nawait drone.takeoff();\n\n// TODO: 다른 크기로 함수 호출\n// await flySquare(3);\n// await flySquare(5);\n\nawait drone.land();\n',
                timeLimit: 150,
                collectibles: [],
                _extraVisuals: [],
                _visited3m: false,
                _visited5m: false,
                _visited8m: false,
                _targets3: [
                    { x: 0, y: 3, z: -3 }, { x: 3, y: 3, z: -3 },
                    { x: 3, y: 3, z: 0 }, { x: 0, y: 3, z: 0 }
                ],
                _targets5: [
                    { x: 0, y: 3, z: -5 }, { x: 5, y: 3, z: -5 },
                    { x: 5, y: 3, z: 0 }, { x: 0, y: 3, z: 0 }
                ],
                _smallCorners: 0,
                _bigCorners: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._smallCorners = 0;
                    this._bigCorners = 0;
                    // 작은 사각형 (3m)
                    var pts3 = this._targets3.concat([this._targets3[0]]);
                    addLine(scene, this._extraVisuals, pts3, 0x44ff88);
                    addLabel(scene, this._extraVisuals, 1.5, 5, -1.5, '3m 사각형', '#44ff88');
                    // 큰 사각형 (5m)
                    var pts5 = this._targets5.concat([this._targets5[0]]);
                    addLine(scene, this._extraVisuals, pts5, 0xff8844);
                    addLabel(scene, this._extraVisuals, 2.5, 6, -2.5, '5m 사각형', '#ff8844');
                    // 코너 마커
                    var self = this;
                    this._targets3.forEach(function (p) {
                        var sp = addSphere(scene, self.collectibles, p.x, p.y, p.z, 0x44ff88, 0.5);
                        sp.userData = { visited: false, group: 'small' };
                    });
                    this._targets5.forEach(function (p) {
                        var sp = addSphere(scene, self.collectibles, p.x, p.y, p.z, 0xff8844, 0.5);
                        sp.userData = { visited: false, group: 'big' };
                    });
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    for (var i = 0; i < this.collectibles.length; i++) {
                        var sp = this.collectibles[i];
                        if (sp.userData && sp.userData.visited) continue;
                        if (dist3D(state, sp.position) < 3) {
                            sp.userData.visited = true;
                            sp.material.opacity = 0.15;
                            if (sp.userData.group === 'small') this._smallCorners++;
                            else if (sp.userData.group === 'big') this._bigCorners++;
                        }
                    }
                },
                objectives: [
                    {
                        description: '매개변수 있는 함수 정의',
                        check: function () { return codeContains(/\bfunction\s+\w+\s*\([^)]+\)/); }
                    },
                    {
                        description: '작은 사각형 (3m) 완성',
                        check: function (s, t, m) { return m._smallCorners >= 4; }
                    },
                    {
                        description: '큰 사각형 (5m) 완성 후 착륙',
                        check: function (s, t, m) { return m._bigCorners >= 4 && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 120; },
                    threeStar: function (t) { return t < 80; }
                }
            },

            // ====== 미션 6: 자율비행 알고리즘 ======
            {
                name: '자율비행 알고리즘',
                description: '모든 개념을 조합해 자율비행 알고리즘을 완성하세요!',
                hint: 'for문, if문, function, 센서를 모두 활용하세요! flyTo(), followPath()도 사용 가능합니다.',
                starterCode: '// 미션 6: 자율비행 알고리즘\n// 배운 모든 개념을 활용하세요!\n\nawait drone.takeoff();\ndrone.setSpeed(4);\n\n// TODO: 반복문, 조건문, 함수, 센서를 조합하여\n// 4개의 웨이포인트를 방문하고\n// 2개의 링을 통과한 뒤\n// 착륙 패드에 착륙하세요!\n\n// 웨이포인트 좌표:\n// (10, 5, 0), (10, 6, -10), (0, 7, -15), (-10, 5, -10)\n// 링 위치: (-5, 6, -15), (-5, 5, -5)\n// 착륙 패드: (0, 0, 0)\n\n\nawait drone.land();\n',
                timeLimit: 180,
                collectibles: [],
                _extraVisuals: [],
                _waypointsVisited: 0,
                _ringsPassed: 0,
                _landedOnPad: false,
                _targets: [
                    { x: 10, y: 5, z: 0 },
                    { x: 10, y: 6, z: -10 },
                    { x: 0, y: 7, z: -15 },
                    { x: -10, y: 5, z: -10 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._waypointsVisited = 0;
                    this._ringsPassed = 0;
                    this._landedOnPad = false;

                    var self = this;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44];

                    // 웨이포인트 (indices 0-7)
                    this._targets.forEach(function (pos, i) {
                        var sp = addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], 0.6);
                        sp.userData = { visited: false };
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });

                    // 경로 연결선
                    addLine(scene, this._extraVisuals, this._targets);

                    // 링 2개 (indices 8-9)
                    var rings = [
                        { x: -5, y: 6, z: -15, ry: Math.PI / 2 },
                        { x: -5, y: 5, z: -5, ry: 0 }
                    ];
                    rings.forEach(function (r) {
                        var geo = new THREE.TorusGeometry(1.8, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({ color: 0xff00ff, transparent: true, opacity: 0.7 });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(r.x, r.y, r.z);
                        mesh.rotation.y = r.ry;
                        mesh.userData = { passed: false };
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });

                    // 착륙 패드 (index 10)
                    var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(0, 0.1, 0);
                    scene.add(pad);
                    this.collectibles.push(pad);

                    // H 마크
                    var c = document.createElement('canvas');
                    c.width = 128; c.height = 128;
                    var ctx = c.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 80px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('H', 64, 64);
                    var tex = new THREE.CanvasTexture(c);
                    var sMat = new THREE.SpriteMaterial({ map: tex, transparent: true });
                    var sprite = new THREE.Sprite(sMat);
                    sprite.position.set(0, 0.5, 0);
                    sprite.scale.set(3, 3, 1);
                    scene.add(sprite);
                    this._extraVisuals.push(sprite);
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    // 웨이포인트 체크
                    for (var i = 0; i < 4; i++) {
                        var sphere = this.collectibles[i * 2];
                        if (!sphere || (sphere.userData && sphere.userData.visited)) continue;
                        if (dist3D(state, sphere.position) < 3) {
                            sphere.userData.visited = true;
                            sphere.material.opacity = 0.15;
                            this._waypointsVisited++;
                        }
                    }
                    // 링 체크
                    for (var j = 8; j < 10; j++) {
                        var ring = this.collectibles[j];
                        if (!ring || (ring.userData && ring.userData.passed)) continue;
                        if (dist3D(state, ring.position) < 2.5) {
                            ring.userData.passed = true;
                            ring.material.opacity = 0.2;
                            this._ringsPassed++;
                        }
                    }
                    // 착륙 패드 체크
                    if (!this._landedOnPad && !state.isFlying && state.altitude < 0.5) {
                        var pd = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                        if (pd < 2.5) this._landedOnPad = true;
                    }
                },
                objectives: [
                    {
                        description: '모든 웨이포인트 방문 (4개)',
                        check: function (s, t, m) { return m._waypointsVisited >= 4; }
                    },
                    {
                        description: '모든 링 통과 (2개)',
                        check: function (s, t, m) { return m._ringsPassed >= 2; }
                    },
                    {
                        description: '착륙 패드에 정밀 착륙!',
                        check: function (s, t, m) { return m._landedOnPad; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 140; },
                    threeStar: function (t) { return t < 90; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createCodingMissions = createCodingMissions;
})();
