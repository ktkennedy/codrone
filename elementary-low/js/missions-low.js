/**
 * 저학년 미션 정의 (5개)
 * 쉽고 직관적인 미션으로 드론 조종 기초를 배웁니다.
 */
(function () {
    'use strict';

    function createLowMissions() {
        return [
            // 미션 1: 첫 비행
            {
                name: '첫 비행',
                description: '이륙해서 5초 동안 떠 있다가 착륙해요!',
                timeLimit: 60,
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 1.5; }
                    },
                    {
                        description: '3m 이상 높이 올라가기',
                        check: function (state) { return state.altitude > 3; }
                    },
                    {
                        description: '착륙하기',
                        _hoverStartTime: null,
                        _hovered: false,
                        check: function (state, time, mission) {
                            if (state.altitude > 2 && !this._hovered) {
                                if (!this._hoverStartTime) this._hoverStartTime = time;
                                if (time - this._hoverStartTime > 3) this._hovered = true;
                            }
                            return this._hovered && !state.isFlying && state.altitude < 0.5;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 30; },
                    threeStar: function (time) { return time < 15; }
                }
            },

            // 미션 2: 별 모으기
            {
                name: '별 모으기',
                description: '하늘에 떠 있는 별 3개를 모아요!',
                timeLimit: 90,
                collectibles: [],
                _collected: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._collected = 0;
                    var starPositions = [
                        { x: 5, y: 5, z: 0 },
                        { x: -3, y: 8, z: 4 },
                        { x: 0, y: 6, z: -5 }
                    ];
                    var self = this;
                    starPositions.forEach(function (pos) {
                        var starGroup = new THREE.Group();
                        // 별 모양 (8각형 + 빛)
                        var geo = new THREE.OctahedronGeometry(0.4, 0);
                        var mat = new THREE.MeshBasicMaterial({ color: 0xffd700 });
                        var mesh = new THREE.Mesh(geo, mat);
                        starGroup.add(mesh);
                        // 빛나는 효과
                        var glowGeo = new THREE.SphereGeometry(0.6, 8, 8);
                        var glowMat = new THREE.MeshBasicMaterial({
                            color: 0xffd700, transparent: true, opacity: 0.3
                        });
                        starGroup.add(new THREE.Mesh(glowGeo, glowMat));
                        starGroup.position.set(pos.x, pos.y, pos.z);
                        starGroup.userData.collected = false;
                        scene.add(starGroup);
                        self.collectibles.push(starGroup);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (s) { scene.remove(s); });
                    this.collectibles = [];
                },
                objectives: [
                    {
                        description: '별 1개 모으기',
                        check: function (state, time, mission) { return mission._collected >= 1; }
                    },
                    {
                        description: '별 2개 모으기',
                        check: function (state, time, mission) { return mission._collected >= 2; }
                    },
                    {
                        description: '별 3개 모두 모으기!',
                        check: function (state, time, mission) { return mission._collected >= 3; }
                    }
                ],
                frameUpdate: function (state) {
                    var self = this;
                    this.collectibles.forEach(function (star) {
                        if (star.userData.collected) return;
                        // 회전 애니메이션
                        star.rotation.y += 0.02;
                        // 충돌 체크 (거리 1.5m 이내)
                        var dx = state.position.x - star.position.x;
                        var dy = state.position.y - star.position.y;
                        var dz = state.position.z - star.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 1.5) {
                            star.userData.collected = true;
                            star.visible = false;
                            self._collected++;
                        }
                    });
                },
                starCriteria: {
                    twoStar: function (time) { return time < 45; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 3: 구름 피하기
            {
                name: '구름 피하기',
                description: '구름 사이를 지나 목표 지점에 도착해요!',
                timeLimit: 60,
                collectibles: [],
                _reachedGoal: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedGoal = false;
                    // 목표 지점 (링)
                    var ringGeo = new THREE.TorusGeometry(1.5, 0.1, 8, 20);
                    var ringMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
                    var ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(15, 6, 0);
                    ring.rotation.y = Math.PI / 2;
                    scene.add(ring);
                    this.collectibles.push(ring);
                    // 빛나는 효과
                    var glowGeo = new THREE.TorusGeometry(1.5, 0.3, 8, 20);
                    var glowMat = new THREE.MeshBasicMaterial({
                        color: 0x44ff88, transparent: true, opacity: 0.2
                    });
                    var glow = new THREE.Mesh(glowGeo, glowMat);
                    glow.position.copy(ring.position);
                    glow.rotation.copy(ring.rotation);
                    scene.add(glow);
                    this.collectibles.push(glow);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '높이 5m 이상 올라가기',
                        check: function (state) { return state.altitude > 5; }
                    },
                    {
                        description: '초록 링에 도착하기',
                        check: function (state, time, mission) {
                            var dx = state.position.x - 15;
                            var dy = state.position.y - 6;
                            var dz = state.position.z - 0;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2) mission._reachedGoal = true;
                            return mission._reachedGoal;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 30; },
                    threeStar: function (time) { return time < 18; }
                }
            },

            // 미션 4: 무지개 링 통과
            {
                name: '무지개 링 통과',
                description: '무지개 색 링을 순서대로 통과해요!',
                timeLimit: 120,
                collectibles: [],
                _currentRing: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentRing = 0;
                    var colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff];
                    var positions = [
                        { x: 5, y: 4, z: 0 },
                        { x: 10, y: 6, z: 5 },
                        { x: 8, y: 8, z: 12 },
                        { x: 2, y: 5, z: 15 },
                        { x: -3, y: 3, z: 8 }
                    ];
                    var self = this;
                    positions.forEach(function (pos, i) {
                        var geo = new THREE.TorusGeometry(1.2, 0.15, 8, 20);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i],
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, pos.y, pos.z);
                        ring.lookAt(
                            pos.x + (positions[(i + 1) % positions.length].x - pos.x),
                            pos.y,
                            pos.z + (positions[(i + 1) % positions.length].z - pos.z)
                        );
                        ring.userData.index = i;
                        scene.add(ring);
                        self.collectibles.push(ring);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) { scene.remove(obj); });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    if (this._currentRing >= this.collectibles.length) return;
                    var ring = this.collectibles[this._currentRing];
                    var dx = state.position.x - ring.position.x;
                    var dy = state.position.y - ring.position.y;
                    var dz = state.position.z - ring.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 2) {
                        ring.material.opacity = 0.15;
                        this._currentRing++;
                        if (this._currentRing < this.collectibles.length) {
                            this.collectibles[this._currentRing].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '빨간 링 통과',
                        check: function (s, t, m) { return m._currentRing >= 1; }
                    },
                    {
                        description: '주황, 노랑 링 통과',
                        check: function (s, t, m) { return m._currentRing >= 3; }
                    },
                    {
                        description: '모든 링 통과!',
                        check: function (s, t, m) { return m._currentRing >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 5: 안전 착륙
            {
                name: '안전 착륙',
                description: '착륙 패드 위에 정확히 착륙해요!',
                timeLimit: 60,
                objectives: [
                    {
                        description: '이륙해서 10m 높이까지 올라가기',
                        check: function (state) { return state.altitude > 10; }
                    },
                    {
                        description: '착륙 패드 위로 돌아오기 (3m 이내)',
                        _above: false,
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
                            if (dist < 3) this._above = true;
                            return this._above;
                        }
                    },
                    {
                        description: '착륙 패드에 정확히 착륙! (1.5m 이내)',
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
                            return !state.isFlying && state.altitude < 0.3 && dist < 1.5;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 30; },
                    threeStar: function (time) { return time < 18; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createLowMissions = createLowMissions;
})();
