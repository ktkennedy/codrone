/**
 * 블록 코딩 미션 정의 (6개)
 * 블록 코딩에 특화된 교육용 미션
 */
(function () {
    'use strict';

    function createBlocklyMissions() {
        return [
            // 미션 1: 첫 블록 코딩
            {
                name: '첫 블록 코딩',
                description: '블록을 사용해 이륙, 호버링, 착륙을 완료하세요!',
                timeLimit: 60,
                objectives: [
                    {
                        description: '이륙 블록으로 2m 이상 이륙',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '3초 동안 호버링',
                        _hoverStart: null,
                        check: function (state, time) {
                            if (state.altitude > 2 && state.altitude < 4 && state.speed < 0.5) {
                                if (!this._hoverStart) this._hoverStart = time;
                                return time - this._hoverStart > 3;
                            }
                            this._hoverStart = null;
                            return false;
                        }
                    },
                    {
                        description: '안전하게 착륙',
                        check: function (state) {
                            return !state.isFlying && state.altitude < 0.3;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 45; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 2: 사각형 비행
            {
                name: '사각형 비행',
                description: '반복 블록을 사용해 사각형 모양으로 비행하세요!',
                timeLimit: 120,
                collectibles: [],
                _extraVisuals: [],
                _currentWaypoint: 0,
                _targets: [
                    { x: 8, y: 3, z: 0 },
                    { x: 8, y: 3, z: 8 },
                    { x: 0, y: 3, z: 8 },
                    { x: 0, y: 3, z: 0 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentWaypoint = 0;

                    var self = this;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44];

                    this._targets.forEach(function (pos, i) {
                        // 웨이포인트 구체
                        var geo = new THREE.SphereGeometry(0.8, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.7
                        });
                        var sphere = new THREE.Mesh(geo, mat);
                        sphere.position.set(pos.x, pos.y, pos.z);
                        scene.add(sphere);
                        self.collectibles.push(sphere);

                        // 수직 빔
                        var beamGeo = new THREE.CylinderGeometry(0.04, 0.04, pos.y, 8);
                        var beamMat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.3
                        });
                        var beam = new THREE.Mesh(beamGeo, beamMat);
                        beam.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(beam);
                        self.collectibles.push(beam);
                    });

                    // 경로 연결선
                    var points = this._targets.map(function (t) { return new THREE.Vector3(t.x, t.y, t.z); });
                    points.push(new THREE.Vector3(this._targets[0].x, this._targets[0].y, this._targets[0].z));
                    var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    var lineMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5 });
                    var line = new THREE.Line(lineGeo, lineMat);
                    scene.add(line);
                    this._extraVisuals.push(line);
                },
                cleanup: function (scene) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this._extraVisuals.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (this._currentWaypoint >= this._targets.length) return;
                    var target = this._targets[this._currentWaypoint];
                    var dx = state.position.x - target.x;
                    var dy = state.position.y - target.y;
                    var dz = state.position.z - target.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 3.5) {
                        this._currentWaypoint++;
                    }
                },
                objectives: [
                    {
                        description: '첫 번째, 두 번째 모서리 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 2; }
                    },
                    {
                        description: '세 번째, 네 번째 모서리 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 4; }
                    },
                    {
                        description: '사각형 완성!',
                        check: function (s, t, m) { return m._currentWaypoint >= 4 && !s.isFlying; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 90; },
                    threeStar: function (time) { return time < 60; }
                }
            },

            // 미션 3: 높이 맞추기
            {
                name: '높이 맞추기',
                description: '조건 블록을 사용해 3개의 서로 다른 높이에 도달하세요!',
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
                    var colors = [0xff4444, 0xffaa00, 0x44ff44];
                    var self = this;

                    heights.forEach(function (h, i) {
                        // 수평 링 (높이 마커)
                        var ringGeo = new THREE.TorusGeometry(4, 0.1, 16, 32);
                        var ringMat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.4
                        });
                        var ring = new THREE.Mesh(ringGeo, ringMat);
                        ring.position.set(0, h, 0);
                        ring.rotation.x = Math.PI / 2;
                        scene.add(ring);
                        self.collectibles.push(ring);

                        // 높이 라벨
                        var canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        var ctx = canvas.getContext('2d');
                        ctx.fillStyle = 'rgba(0,0,0,0.8)';
                        ctx.fillRect(0, 0, 64, 64);
                        var hex = '#' + ('000000' + colors[i].toString(16)).slice(-6);
                        ctx.fillStyle = hex;
                        ctx.font = 'bold 28px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(h + 'm', 32, 32);
                        var texture = new THREE.CanvasTexture(canvas);
                        var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
                        var sprite = new THREE.Sprite(spriteMat);
                        sprite.position.set(5, h, 0);
                        sprite.scale.set(2, 2, 1);
                        scene.add(sprite);
                        self._extraVisuals.push(sprite);
                    });
                },
                cleanup: function (scene) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this._extraVisuals.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (obj.material.map) obj.material.map.dispose();
                            obj.material.dispose();
                        }
                    });
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (!this._reached3m && state.altitude > 2.5 && state.altitude < 3.5) {
                        this._reached3m = true;
                        this.collectibles[0].material.opacity = 0.8;
                    }
                    if (!this._reached6m && state.altitude > 5.5 && state.altitude < 6.5) {
                        this._reached6m = true;
                        this.collectibles[1].material.opacity = 0.8;
                    }
                    if (!this._reached9m && state.altitude > 8.5 && state.altitude < 9.5) {
                        this._reached9m = true;
                        this.collectibles[2].material.opacity = 0.8;
                    }
                },
                objectives: [
                    {
                        description: '3m 높이 도달',
                        check: function (s, t, m) { return m._reached3m; }
                    },
                    {
                        description: '6m 높이 도달',
                        check: function (s, t, m) { return m._reached6m; }
                    },
                    {
                        description: '9m 높이 도달 및 안전 착륙',
                        check: function (s, t, m) { return m._reached9m && !s.isFlying; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 4: 웨이포인트 순찰
            {
                name: '웨이포인트 순찰',
                description: '좌표 비행 블록으로 5개 지점을 순서대로 방문하세요!',
                timeLimit: 150,
                collectibles: [],
                _extraVisuals: [],
                _currentTarget: 0,
                _targets: [
                    { x: 10, y: 4, z: 0 },
                    { x: 10, y: 5, z: 10 },
                    { x: 0, y: 6, z: 10 },
                    { x: -10, y: 5, z: 5 },
                    { x: 0, y: 4, z: 0 }
                ],
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._currentTarget = 0;

                    var self = this;
                    var colors = [0xff4444, 0xff8800, 0xffff00, 0x44ff44, 0x4488ff];

                    this._targets.forEach(function (pos, i) {
                        // 타겟 구체
                        var geo = new THREE.SphereGeometry(0.8, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true,
                            opacity: i === 0 ? 1.0 : 0.4
                        });
                        var sphere = new THREE.Mesh(geo, mat);
                        sphere.position.set(pos.x, pos.y, pos.z);
                        scene.add(sphere);
                        self.collectibles.push(sphere);

                        // 수직 빔
                        var beamGeo = new THREE.CylinderGeometry(0.04, 0.04, pos.y, 8);
                        var beamMat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.3
                        });
                        var beam = new THREE.Mesh(beamGeo, beamMat);
                        beam.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(beam);
                        self.collectibles.push(beam);

                        // 번호 라벨
                        var canvas = document.createElement('canvas');
                        canvas.width = 64;
                        canvas.height = 64;
                        var ctx = canvas.getContext('2d');
                        ctx.fillStyle = 'rgba(0,0,0,0.75)';
                        ctx.beginPath();
                        ctx.arc(32, 32, 28, 0, Math.PI * 2);
                        ctx.fill();
                        var hex = '#' + ('000000' + colors[i].toString(16)).slice(-6);
                        ctx.strokeStyle = hex;
                        ctx.lineWidth = 3;
                        ctx.beginPath();
                        ctx.arc(32, 32, 28, 0, Math.PI * 2);
                        ctx.stroke();
                        ctx.fillStyle = hex;
                        ctx.font = 'bold 34px sans-serif';
                        ctx.textAlign = 'center';
                        ctx.textBaseline = 'middle';
                        ctx.fillText(String(i + 1), 32, 34);
                        var texture = new THREE.CanvasTexture(canvas);
                        var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true, depthTest: false });
                        var sprite = new THREE.Sprite(spriteMat);
                        sprite.position.set(pos.x, pos.y + 1.5, pos.z);
                        sprite.scale.set(2, 2, 1);
                        scene.add(sprite);
                        self._extraVisuals.push(sprite);
                    });

                    // 경로 연결선
                    var points = this._targets.map(function (t) { return new THREE.Vector3(t.x, t.y, t.z); });
                    var lineGeo = new THREE.BufferGeometry().setFromPoints(points);
                    var lineMat = new THREE.LineBasicMaterial({ color: 0x00ccff, transparent: true, opacity: 0.5 });
                    var line = new THREE.Line(lineGeo, lineMat);
                    scene.add(line);
                    this._extraVisuals.push(line);
                },
                cleanup: function (scene) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this._extraVisuals.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (obj.material.map) obj.material.map.dispose();
                            obj.material.dispose();
                        }
                    });
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (this._currentTarget >= this._targets.length) return;
                    var target = this._targets[this._currentTarget];
                    var dx = state.position.x - target.x;
                    var dy = state.position.y - target.y;
                    var dz = state.position.z - target.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 3) {
                        this.collectibles[this._currentTarget * 2].material.opacity = 0.1;
                        this._currentTarget++;
                        if (this._currentTarget < this._targets.length) {
                            this.collectibles[this._currentTarget * 2].material.opacity = 1.0;
                        }
                    }
                },
                objectives: [
                    {
                        description: '웨이포인트 1, 2 방문',
                        check: function (s, t, m) { return m._currentTarget >= 2; }
                    },
                    {
                        description: '웨이포인트 3, 4 방문',
                        check: function (s, t, m) { return m._currentTarget >= 4; }
                    },
                    {
                        description: '모든 웨이포인트 방문 완료!',
                        check: function (s, t, m) { return m._currentTarget >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 120; },
                    threeStar: function (time) { return time < 80; }
                }
            },

            // 미션 5: 센서 탐험
            {
                name: '센서 탐험',
                description: '센서 블록으로 위치를 파악하고 착륙 패드를 찾으세요!',
                timeLimit: 120,
                collectibles: [],
                _extraVisuals: [],
                _reached8m: false,
                _foundPad: false,
                _landedOnPad: false,
                _padPosition: { x: 15, z: 15 },
                setup: function (scene) {
                    this.collectibles = [];
                    this._extraVisuals = [];
                    this._reached8m = false;
                    this._foundPad = false;
                    this._landedOnPad = false;

                    // 8m 고도 마커
                    var ringGeo = new THREE.TorusGeometry(5, 0.12, 16, 32);
                    var ringMat = new THREE.MeshBasicMaterial({
                        color: 0x00ccff, transparent: true, opacity: 0.4
                    });
                    var ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(0, 8, 0);
                    ring.rotation.x = Math.PI / 2;
                    scene.add(ring);
                    this.collectibles.push(ring);

                    // 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xff8800 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(this._padPosition.x, 0.1, this._padPosition.z);
                    scene.add(pad);
                    this.collectibles.push(pad);

                    // 착륙 패드 H-마크
                    var canvas = document.createElement('canvas');
                    canvas.width = 128;
                    canvas.height = 128;
                    var ctx = canvas.getContext('2d');
                    ctx.fillStyle = '#ffffff';
                    ctx.font = 'bold 80px sans-serif';
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('H', 64, 64);
                    var texture = new THREE.CanvasTexture(canvas);
                    var spriteMat = new THREE.SpriteMaterial({ map: texture, transparent: true });
                    var sprite = new THREE.Sprite(spriteMat);
                    sprite.position.set(this._padPosition.x, 0.3, this._padPosition.z);
                    sprite.scale.set(3, 3, 1);
                    scene.add(sprite);
                    this._extraVisuals.push(sprite);
                },
                cleanup: function (scene) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this._extraVisuals.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (obj.material.map) obj.material.map.dispose();
                            obj.material.dispose();
                        }
                    });
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    if (!this._reached8m && state.altitude > 7.5) {
                        this._reached8m = true;
                    }
                    var dx = state.position.x - this._padPosition.x;
                    var dz = state.position.z - this._padPosition.z;
                    var dist = Math.sqrt(dx * dx + dz * dz);
                    if (!this._foundPad && dist < 8 && state.altitude > 3) {
                        this._foundPad = true;
                    }
                    if (!this._landedOnPad && !state.isFlying && state.altitude < 0.5 && dist < 2.5) {
                        this._landedOnPad = true;
                    }
                },
                objectives: [
                    {
                        description: '8m 고도 도달',
                        check: function (s, t, m) { return m._reached8m; }
                    },
                    {
                        description: '착륙 패드 발견',
                        check: function (s, t, m) { return m._foundPad; }
                    },
                    {
                        description: '착륙 패드에 착륙!',
                        check: function (s, t, m) { return m._landedOnPad; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 90; },
                    threeStar: function (time) { return time < 60; }
                }
            },

            // 미션 6: 자율비행 챌린지
            {
                name: '자율비행 챌린지',
                description: '모든 블록 기술을 종합해 완벽한 자율비행을 완성하세요!',
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

                    // 웨이포인트
                    this._targets.forEach(function (pos, i) {
                        var geo = new THREE.SphereGeometry(0.7, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.6
                        });
                        var sphere = new THREE.Mesh(geo, mat);
                        sphere.position.set(pos.x, pos.y, pos.z);
                        sphere.userData.visited = false;
                        scene.add(sphere);
                        self.collectibles.push(sphere);

                        // 수직 빔
                        var beamGeo = new THREE.CylinderGeometry(0.04, 0.04, pos.y, 8);
                        var beamMat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.3
                        });
                        var beam = new THREE.Mesh(beamGeo, beamMat);
                        beam.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(beam);
                        self.collectibles.push(beam);
                    });

                    // 링 2개
                    var rings = [
                        { x: -5, y: 6, z: 15, ry: Math.PI / 2 },
                        { x: -5, y: 5, z: 5, ry: 0 }
                    ];
                    rings.forEach(function (ring) {
                        var geo = new THREE.TorusGeometry(1.8, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff00ff, transparent: true, opacity: 0.7
                        });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(ring.x, ring.y, ring.z);
                        mesh.rotation.y = ring.ry;
                        mesh.userData.passed = false;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });

                    // 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.2, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(0, 0.1, 0);
                    scene.add(pad);
                    this.collectibles.push(pad);
                },
                cleanup: function (scene) {
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this._extraVisuals.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) obj.material.dispose();
                    });
                    this.collectibles = [];
                    this._extraVisuals = [];
                },
                frameUpdate: function (state) {
                    var self = this;

                    // 웨이포인트 체크 (첫 8개 collectibles, 짝수 인덱스)
                    for (var i = 0; i < 4; i++) {
                        var sphere = this.collectibles[i * 2];
                        if (sphere.userData.visited) continue;
                        var dx = state.position.x - sphere.position.x;
                        var dy = state.position.y - sphere.position.y;
                        var dz = state.position.z - sphere.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 3) {
                            sphere.userData.visited = true;
                            sphere.material.opacity = 0.2;
                            this._waypointsVisited++;
                        }
                    }

                    // 링 체크
                    for (var i = 8; i < 10; i++) {
                        var ring = this.collectibles[i];
                        if (ring.userData.passed) continue;
                        var dx = state.position.x - ring.position.x;
                        var dy = state.position.y - ring.position.y;
                        var dz = state.position.z - ring.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 2.5) {
                            ring.userData.passed = true;
                            ring.material.opacity = 0.2;
                            this._ringsPassed++;
                        }
                    }

                    // 착륙 패드 체크
                    if (!this._landedOnPad && !state.isFlying && state.altitude < 0.5) {
                        var padDist = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                        if (padDist < 2.5) {
                            this._landedOnPad = true;
                        }
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
                    twoStar: function (time) { return time < 150; },
                    threeStar: function (time) { return time < 100; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createBlocklyMissions = createBlocklyMissions;
})();
