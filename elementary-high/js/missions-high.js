/**
 * 고학년 미션 정의 (6개)
 * 더 복잡하고 도전적인 미션으로 드론 조종 실력을 키웁니다.
 */
(function () {
    'use strict';

    function createHighMissions() {
        return [
            // 미션 1: 정밀 비행
            {
                name: '정밀 비행',
                description: '체크포인트 4개를 순서대로 통과하세요.',
                timeLimit: 90,
                collectibles: [],
                _currentCheckpoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentCheckpoint = 0;
                    var positions = [
                        { x: 8, y: 5, z: 0 },
                        { x: 8, y: 10, z: 8 },
                        { x: -5, y: 7, z: 10 },
                        { x: -5, y: 4, z: 0 }
                    ];
                    var self = this;
                    positions.forEach(function (pos, i) {
                        var geo = new THREE.TorusGeometry(1, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0x00aaff,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.25
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, pos.y, pos.z);

                        // 다음 체크포인트를 향하도록 회전
                        var next = positions[(i + 1) % positions.length];
                        ring.lookAt(next.x, next.y, next.z);

                        scene.add(ring);
                        self.collectibles.push(ring);

                        // 번호 표시 (간단한 스프라이트 대신 작은 구)
                        var numGeo = new THREE.SphereGeometry(0.2, 8, 8);
                        var numMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                        var numMesh = new THREE.Mesh(numGeo, numMat);
                        numMesh.position.set(pos.x, pos.y + 1.5, pos.z);
                        scene.add(numMesh);
                        self.collectibles.push(numMesh);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentCheckpoint >= 4) return;
                    var ring = this.collectibles[this._currentCheckpoint * 2]; // 링은 짝수 인덱스
                    var dx = state.position.x - ring.position.x;
                    var dy = state.position.y - ring.position.y;
                    var dz = state.position.z - ring.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 2) {
                        ring.material.opacity = 0.1;
                        this._currentCheckpoint++;
                        if (this._currentCheckpoint < 4) {
                            this.collectibles[this._currentCheckpoint * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '체크포인트 1 통과',
                        check: function (s, t, m) { return m._currentCheckpoint >= 1; }
                    },
                    {
                        description: '체크포인트 2, 3 통과',
                        check: function (s, t, m) { return m._currentCheckpoint >= 3; }
                    },
                    {
                        description: '모든 체크포인트 통과!',
                        check: function (s, t, m) { return m._currentCheckpoint >= 4; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 2: 장애물 코스
            {
                name: '장애물 코스',
                description: '장애물을 피해 골에 도착하세요! 장애물 충돌 시 실패!',
                timeLimit: 120,
                collectibles: [],
                _reachedGoal: false,
                _hitObstacle: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedGoal = false;
                    this._hitObstacle = false;
                    // 장애물 기둥
                    var obstacles = [
                        { x: 5, z: 0, h: 12 },
                        { x: 10, z: 3, h: 8 },
                        { x: 10, z: -3, h: 15 },
                        { x: 16, z: 0, h: 10 },
                        { x: 22, z: 2, h: 14 },
                        { x: 22, z: -4, h: 7 }
                    ];
                    var self = this;
                    obstacles.forEach(function (obs) {
                        var geo = new THREE.CylinderGeometry(0.8, 0.8, obs.h, 8);
                        var mat = new THREE.MeshPhongMaterial({
                            color: 0xff4444,
                            transparent: true,
                            opacity: 0.7
                        });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(obs.x, obs.h / 2, obs.z);
                        mesh.userData.isObstacle = true;
                        mesh.userData.radius = 0.8;
                        mesh.userData.height = obs.h;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });
                    // 골 링
                    var goalGeo = new THREE.TorusGeometry(2, 0.15, 8, 24);
                    var goalMat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
                    var goal = new THREE.Mesh(goalGeo, goalMat);
                    goal.position.set(28, 6, 0);
                    goal.rotation.y = Math.PI / 2;
                    scene.add(goal);
                    self.collectibles.push(goal);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    // 장애물 충돌 체크
                    var self = this;
                    this.collectibles.forEach(function (obj) {
                        if (!obj.userData.isObstacle) return;
                        var dx = state.position.x - obj.position.x;
                        var dz = state.position.z - obj.position.z;
                        var dist2d = Math.sqrt(dx * dx + dz * dz);
                        if (dist2d < obj.userData.radius + 0.3 && state.position.y < obj.userData.height) {
                            self._hitObstacle = true;
                        }
                    });
                    // 골 체크
                    var goalDist = Math.sqrt(
                        (state.position.x - 28) ** 2 +
                        (state.position.y - 6) ** 2 +
                        state.position.z ** 2
                    );
                    if (goalDist < 2.5) this._reachedGoal = true;
                },
                failCondition: function (state, time) {
                    return this._hitObstacle;
                },
                failMessage: '장애물에 부딪혔어요!',
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '장애물 사이를 지나가기',
                        check: function (state) { return state.position.x > 15; }
                    },
                    {
                        description: '골든 링에 도착!',
                        check: function (s, t, m) { return m._reachedGoal; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 3: 시간 도전
            {
                name: '시간 도전',
                description: '3개의 링을 40초 안에 통과하세요!',
                timeLimit: 40,
                collectibles: [],
                _passed: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passed = 0;
                    var positions = [
                        { x: 10, y: 5, z: 5 },
                        { x: -5, y: 8, z: -8 },
                        { x: 12, y: 3, z: -10 }
                    ];
                    var self = this;
                    positions.forEach(function (pos, i) {
                        var geo = new THREE.TorusGeometry(1.2, 0.1, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff4444,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, pos.y, pos.z);
                        scene.add(ring);
                        self.collectibles.push(ring);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._passed >= this.collectibles.length) return;
                    var ring = this.collectibles[this._passed];
                    var dist = Math.sqrt(
                        (state.position.x - ring.position.x) ** 2 +
                        (state.position.y - ring.position.y) ** 2 +
                        (state.position.z - ring.position.z) ** 2
                    );
                    if (dist < 2) {
                        ring.material.opacity = 0.1;
                        this._passed++;
                        if (this._passed < this.collectibles.length) {
                            this.collectibles[this._passed].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '링 1 통과',
                        check: function (s, t, m) { return m._passed >= 1; }
                    },
                    {
                        description: '링 2 통과',
                        check: function (s, t, m) { return m._passed >= 2; }
                    },
                    {
                        description: '링 3 통과 - 완주!',
                        check: function (s, t, m) { return m._passed >= 3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 30; },
                    threeStar: function (time) { return time < 20; }
                }
            },

            // 미션 4: 배달 미션
            {
                name: '배달 미션',
                description: 'A지점에서 화물을 싣고 B지점으로 배달하세요.',
                timeLimit: 90,
                collectibles: [],
                _pickedUp: false,
                _delivered: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._pickedUp = false;
                    this._delivered = false;
                    // A 지점 (화물)
                    var boxGeo = new THREE.BoxGeometry(0.8, 0.8, 0.8);
                    var boxMat = new THREE.MeshPhongMaterial({ color: 0xff8844 });
                    var box = new THREE.Mesh(boxGeo, boxMat);
                    box.position.set(10, 0.4, 10);
                    scene.add(box);
                    this.collectibles.push(box);
                    this._cargo = box;
                    // A 지점 마커
                    var markerA = this._createMarker(scene, 10, 10, 0x44ff88, 'A');
                    this.collectibles.push(markerA);
                    // B 지점 마커
                    var markerB = this._createMarker(scene, -15, -10, 0xff4444, 'B');
                    this.collectibles.push(markerB);
                },
                _createMarker: function (scene, x, z, color, label) {
                    var group = new THREE.Group();
                    var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 6);
                    var poleMat = new THREE.MeshPhongMaterial({ color: color });
                    var pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.y = 1.5;
                    group.add(pole);
                    var flagGeo = new THREE.PlaneGeometry(1, 0.6);
                    var flagMat = new THREE.MeshBasicMaterial({ color: color, side: THREE.DoubleSide });
                    var flag = new THREE.Mesh(flagGeo, flagMat);
                    flag.position.set(0.5, 2.7, 0);
                    group.add(flag);
                    group.position.set(x, 0, z);
                    scene.add(group);
                    return group;
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    // 화물 픽업
                    if (!this._pickedUp) {
                        var dist = Math.sqrt(
                            (state.position.x - 10) ** 2 +
                            (state.position.y - 2) ** 2 +
                            (state.position.z - 10) ** 2
                        );
                        if (dist < 2) {
                            this._pickedUp = true;
                        }
                    }
                    // 화물 따라다니기
                    if (this._pickedUp && this._cargo && !this._delivered) {
                        this._cargo.position.set(
                            state.position.x,
                            state.position.y - 0.5,
                            state.position.z
                        );
                    }
                    // 배달
                    if (this._pickedUp && !this._delivered) {
                        var dist2 = Math.sqrt(
                            (state.position.x + 15) ** 2 +
                            (state.position.z + 10) ** 2
                        );
                        if (dist2 < 3 && state.altitude < 3) {
                            this._delivered = true;
                            if (this._cargo) {
                                this._cargo.position.set(-15, 0.4, -10);
                            }
                        }
                    }
                },
                objectives: [
                    {
                        description: 'A 지점에서 화물 싣기',
                        check: function (s, t, m) { return m._pickedUp; }
                    },
                    {
                        description: 'B 지점으로 이동',
                        check: function (state, t, m) {
                            return m._pickedUp && Math.sqrt(
                                (state.position.x + 15) ** 2 + (state.position.z + 10) ** 2
                            ) < 10;
                        }
                    },
                    {
                        description: 'B 지점에 배달 완료!',
                        check: function (s, t, m) { return m._delivered; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 5: 비상 착륙
            {
                name: '비상 착륙',
                description: '바람이 불어요! 흔들리는 드론을 안정시키고 착륙하세요.',
                timeLimit: 45,
                _windForce: { x: 0, z: 0 },
                _windTimer: 0,
                setup: function () {
                    this._windForce = { x: 0, z: 0 };
                    this._windTimer = 0;
                },
                cleanup: function () {},
                frameUpdate: function (state, physics, dt) {
                    // 바람 효과 (랜덤 변화)
                    this._windTimer += dt || 0.016;
                    if (this._windTimer > 0.5) {
                        this._windTimer = 0;
                        this._windForce.x = (Math.random() - 0.5) * 3;
                        this._windForce.z = (Math.random() - 0.5) * 3;
                    }
                    if (physics && state.isFlying) {
                        physics.velocity.x += this._windForce.x * (dt || 0.016);
                        physics.velocity.z += this._windForce.z * (dt || 0.016);
                    }
                },
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 3; }
                    },
                    {
                        description: '바람 속에서 호버링 유지 (5초)',
                        _stableTime: 0,
                        _lastPos: null,
                        check: function (state, time) {
                            if (state.altitude < 2) { this._stableTime = 0; return false; }
                            if (!this._lastPos) { this._lastPos = { ...state.position }; return false; }
                            var drift = Math.sqrt(
                                (state.position.x - this._lastPos.x) ** 2 +
                                (state.position.z - this._lastPos.z) ** 2
                            );
                            this._lastPos = { ...state.position };
                            if (drift < 0.3) this._stableTime += 0.016;
                            else this._stableTime = Math.max(0, this._stableTime - 0.01);
                            return this._stableTime > 5;
                        }
                    },
                    {
                        description: '착륙 패드에 안전하게 착륙 (2m 이내)',
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
                            return !state.isFlying && state.altitude < 0.3 && dist < 2;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 30; },
                    threeStar: function (time) { return time < 20; }
                }
            },

            // 미션 6: 자유 탐험
            {
                name: '자유 탐험',
                description: '넓은 맵에서 숨겨진 보석 5개를 찾아보세요!',
                timeLimit: 180,
                collectibles: [],
                _found: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._found = 0;
                    var gemPositions = [
                        { x: 25, y: 3, z: 25 },
                        { x: -30, y: 12, z: -5 },
                        { x: 15, y: 8, z: -25 },
                        { x: -20, y: 5, z: 20 },
                        { x: 0, y: 15, z: 0 }
                    ];
                    var colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44, 0xff44ff];
                    var self = this;
                    gemPositions.forEach(function (pos, i) {
                        var geo = new THREE.OctahedronGeometry(0.35, 0);
                        var mat = new THREE.MeshBasicMaterial({ color: colors[i] });
                        var gem = new THREE.Mesh(geo, mat);
                        gem.position.set(pos.x, pos.y, pos.z);
                        gem.userData.found = false;
                        // 빛나는 효과
                        var glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
                        var glowMat = new THREE.MeshBasicMaterial({
                            color: colors[i], transparent: true, opacity: 0.2
                        });
                        var glow = new THREE.Mesh(glowGeo, glowMat);
                        gem.add(glow);
                        scene.add(gem);
                        self.collectibles.push(gem);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    this.collectibles.forEach(function (gem) {
                        if (gem.userData.found) return;
                        gem.rotation.y += 0.03;
                        var dx = state.position.x - gem.position.x;
                        var dy = state.position.y - gem.position.y;
                        var dz = state.position.z - gem.position.z;
                        if (Math.sqrt(dx * dx + dy * dy + dz * dz) < 2) {
                            gem.userData.found = true;
                            gem.visible = false;
                            self._found++;
                        }
                    });
                },
                objectives: [
                    {
                        description: '보석 2개 찾기',
                        check: function (s, t, m) { return m._found >= 2; }
                    },
                    {
                        description: '보석 4개 찾기',
                        check: function (s, t, m) { return m._found >= 4; }
                    },
                    {
                        description: '보석 5개 모두 찾기!',
                        check: function (s, t, m) { return m._found >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 120; },
                    threeStar: function (time) { return time < 60; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createHighMissions = createHighMissions;
})();
