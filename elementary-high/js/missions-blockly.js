/**
 * 블록 코딩 미션 정의 (6개)
 * 프로그래밍 개념을 점진적으로 학습하는 교육용 미션
 */
(function () {
    'use strict';

    // 워크스페이스에서 특정 블록 타입 사용 여부 확인
    function hasBlockType(type) {
        var ws = window._blocklyWorkspace;
        if (!ws) return false;
        var blocks = ws.getAllBlocks(false);
        for (var i = 0; i < blocks.length; i++) {
            if (blocks[i].type === type) return true;
        }
        return false;
    }

    function hasAnyBlockType(types) {
        for (var i = 0; i < types.length; i++) {
            if (hasBlockType(types[i])) return true;
        }
        return false;
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

    function createBlocklyMissions() {
        return [
            // ====== 미션 1: 순차 실행 ======
            {
                name: '순차 실행',
                description: '블록을 순서대로 연결하세요: 이륙 > 앞으로 이동 > 착륙',
                timeLimit: 60,
                collectibles: [],
                _extraVisuals: [],
                _reachedTarget: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._reachedTarget = false;
                    addSphere(scene, this.collectibles, 0, 3, -5, 0x44ff88);
                    addBeam(scene, this.collectibles, 0, 3, -5, 0x44ff88);
                    addLabel(scene, this._extraVisuals, 0, 5.5, -5, '5m 앞', '#44ff88');
                },
                cleanup: function (scene) {
                    cleanupList(scene, this.collectibles);
                    cleanupList(scene, this._extraVisuals);
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (!this._reachedTarget && state.position.z < -3.5 && state.altitude > 1.5) {
                        this._reachedTarget = true;
                    }
                },
                objectives: [
                    { description: '이륙하기 (2m 이상)', check: function (s) { return s.altitude > 2; } },
                    { description: '앞으로 5m 이동', check: function (s, t, m) { return m._reachedTarget; } },
                    { description: '안전하게 착륙', check: function (s, t, m) { return m._reachedTarget && !s.isFlying && s.altitude < 0.3; } }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 40; },
                    threeStar: function (t) { return t < 25; }
                }
            },

            // ====== 미션 2: 반복의 힘 ======
            {
                name: '반복의 힘',
                description: '반복 블록을 사용해 사각형 비행! (반복 블록 필수)',
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
                        description: '반복 블록 배치하기',
                        check: function () { return hasAnyBlockType(['controls_repeat_ext', 'controls_whileUntil']); }
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
                    twoStar: function (t) { return t < 90; },
                    threeStar: function (t) { return t < 60; }
                }
            },

            // ====== 미션 3: 조건 판단 ======
            {
                name: '조건 판단',
                description: '조건(if) 블록과 높이 센서로 3개 높이 링을 통과하세요! (조건 블록 필수)',
                timeLimit: 90,
                collectibles: [],
                _extraVisuals: [],
                _reached3m: false,
                _reached5m: false,
                _reached8m: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._reached3m = false;
                    this._reached5m = false;
                    this._reached8m = false;
                    var heights = [3, 5, 8];
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
                    if (!this._reached5m && state.altitude > 4.5 && state.altitude < 5.5) {
                        this._reached5m = true;
                        if (this.collectibles[1]) this.collectibles[1].material.opacity = 0.8;
                    }
                    if (!this._reached8m && state.altitude > 7.5 && state.altitude < 8.5) {
                        this._reached8m = true;
                        if (this.collectibles[2]) this.collectibles[2].material.opacity = 0.8;
                    }
                },
                objectives: [
                    {
                        description: '조건(if) 블록 배치하기',
                        check: function () { return hasAnyBlockType(['controls_if', 'controls_ifelse']); }
                    },
                    {
                        description: '3m, 5m 높이 링 통과',
                        check: function (s, t, m) { return m._reached3m && m._reached5m; }
                    },
                    {
                        description: '8m 높이 링 통과 후 착륙',
                        check: function (s, t, m) { return m._reached8m && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 70; },
                    threeStar: function (t) { return t < 45; }
                }
            },

            // ====== 미션 4: 변수 활용 ======
            {
                name: '변수 활용',
                description: '변수에 거리를 저장하고 여러 번 사용하세요! (변수 블록 필수)',
                timeLimit: 120,
                collectibles: [],
                _extraVisuals: [],
                _currentWaypoint: 0,
                _targets: [
                    { x: 0, y: 3, z: -5 },
                    { x: 0, y: 3, z: -10 },
                    { x: 5, y: 3, z: -10 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentWaypoint = 0;
                    var colors = [0xff4444, 0xffaa00, 0x44ff44];
                    var self = this;
                    this._targets.forEach(function (pos, i) {
                        addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], i === 0 ? 1.0 : 0.5);
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });
                    addLine(scene, this._extraVisuals, this._targets);
                    addLabel(scene, this._extraVisuals, -2, 5, -5, '거리=5m', '#ffaa00');
                    addLabel(scene, this._extraVisuals, -2, 5, -10, '거리=5m', '#ffaa00');
                    addLabel(scene, this._extraVisuals, 2.5, 5, -10, '거리=5m', '#ffaa00');
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
                        description: '변수 블록 배치하기',
                        check: function () { return hasBlockType('variables_set'); }
                    },
                    {
                        description: '3개 목표 지점 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 3; }
                    },
                    {
                        description: '모든 지점 방문 후 착륙',
                        check: function (s, t, m) { return m._currentWaypoint >= 3 && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 90; },
                    threeStar: function (t) { return t < 60; }
                }
            },

            // ====== 미션 5: 나만의 함수 ======
            {
                name: '나만의 함수',
                description: '함수를 정의하고 반복 호출해 삼각형 비행! (함수 블록 필수)',
                timeLimit: 150,
                collectibles: [],
                _extraVisuals: [],
                _currentWaypoint: 0,
                _targets: [
                    { x: 0, y: 3, z: -6 },
                    { x: 5, y: 3, z: -3 },
                    { x: 0, y: 3, z: 0 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentWaypoint = 0;
                    var colors = [0xff4444, 0xffaa00, 0x44ff44];
                    var self = this;
                    this._targets.forEach(function (pos, i) {
                        addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], i === 0 ? 1.0 : 0.5);
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });
                    var pts = this._targets.concat([this._targets[0]]);
                    addLine(scene, this._extraVisuals, pts);
                    addLabel(scene, this._extraVisuals, 2.5, 5, -3, '함수 사용!', '#bb88ff');
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
                        description: '함수 정의 블록 배치하기',
                        check: function () { return hasAnyBlockType(['procedures_defnoreturn', 'procedures_defreturn']); }
                    },
                    {
                        description: '삼각형 3개 꼭짓점 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 3; }
                    },
                    {
                        description: '삼각형 완성 후 착륙',
                        check: function (s, t, m) { return m._currentWaypoint >= 3 && !s.isFlying && s.altitude < 0.3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (t) { return t < 120; },
                    threeStar: function (t) { return t < 80; }
                }
            },

            // ====== 미션 6: 종합 도전 ======
            {
                name: '종합 도전',
                description: '모든 개념을 조합해 완벽한 자율비행을 완성하세요!',
                timeLimit: 180,
                collectibles: [],
                _extraVisuals: [],
                _waypointsVisited: 0,
                _ringsPassed: 0,
                _landedOnPad: false,
                _targets: [
                    { x: 10, y: 5, z: 0 },
                    { x: 10, y: 6, z: 10 },
                    { x: 0, y: 7, z: 15 },
                    { x: -10, y: 5, z: 10 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._waypointsVisited = 0;
                    this._ringsPassed = 0;
                    this._landedOnPad = false;

                    var self = this;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44];

                    // 웨이포인트 (indices 0-7: sphere+beam pairs)
                    this._targets.forEach(function (pos, i) {
                        var sp = addSphere(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i], 0.6);
                        sp.userData = { visited: false };
                        addBeam(scene, self.collectibles, pos.x, pos.y, pos.z, colors[i]);
                    });

                    // 링 2개 (indices 8-9)
                    var rings = [
                        { x: -5, y: 6, z: 15, ry: Math.PI / 2 },
                        { x: -5, y: 5, z: 5, ry: 0 }
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
                            sphere.material.opacity = 0.2;
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
                    twoStar: function (t) { return t < 150; },
                    threeStar: function (t) { return t < 100; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createBlocklyMissions = createBlocklyMissions;
})();
