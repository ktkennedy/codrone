/**
 * 저학년 미션 정의 (15개)
 * 쉽고 직관적인 미션으로 드론 조종 기초를 배웁니다.
 */
(function () {
    'use strict';

    function createLowMissions() {
        return [
            // 미션 1: 첫 비행
            {
                name: '첫 비행',
                description: '이륙해서 3초 동안 떠 있다가 착륙해요!',
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

            // 미션 2: 높이 조절
            {
                name: '높이 조절',
                description: '원하는 높이로 정확하게 날아가요!',
                timeLimit: 60,
                objectives: [
                    {
                        description: '5m 높이까지 올라가기',
                        check: function (state) { return state.altitude > 5; }
                    },
                    {
                        description: '10m 높이까지 올라가기',
                        check: function (state) { return state.altitude > 10; }
                    },
                    {
                        description: '다시 3m 높이로 내려오기',
                        _wasHigh: false,
                        check: function (state) {
                            if (state.altitude > 10) this._wasHigh = true;
                            return this._wasHigh && state.altitude < 4 && state.altitude > 2;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 35; },
                    threeStar: function (time) { return time < 20; }
                }
            },

            // 미션 3: 앞으로 가기
            {
                name: '앞으로 가기',
                description: '앞으로 10m 날아갔다가 다시 돌아와요!',
                timeLimit: 90,
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '앞으로 10m 이동하기',
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                            return dist > 10;
                        }
                    },
                    {
                        description: '출발 지점으로 돌아오기 (3m 이내)',
                        _wentFar: false,
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                            if (dist > 10) this._wentFar = true;
                            return this._wentFar && dist < 3;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 4: 사각형 비행
            {
                name: '사각형 비행',
                description: '네 개의 웨이포인트를 순서대로 방문해요!',
                timeLimit: 120,
                collectibles: [],
                _currentWaypoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentWaypoint = 0;
                    var waypoints = [
                        { x: 8, y: 5, z: 0 },
                        { x: 8, y: 5, z: 8 },
                        { x: 0, y: 5, z: 8 },
                        { x: 0, y: 5, z: 0 }
                    ];
                    var colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44];
                    var self = this;
                    waypoints.forEach(function (pos, i) {
                        // 웨이포인트 마커
                        var geo = new THREE.SphereGeometry(0.5, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i],
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        marker.userData.index = i;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, pos.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: colors[i] });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentWaypoint >= 4) return;
                    var waypoint = this.collectibles[this._currentWaypoint * 2];
                    var dx = state.position.x - waypoint.position.x;
                    var dy = state.position.y - waypoint.position.y;
                    var dz = state.position.z - waypoint.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 2) {
                        waypoint.material.opacity = 0.15;
                        this._currentWaypoint++;
                        if (this._currentWaypoint < 4) {
                            this.collectibles[this._currentWaypoint * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '빨간 점 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 1; }
                    },
                    {
                        description: '초록, 파랑 점 방문',
                        check: function (s, t, m) { return m._currentWaypoint >= 3; }
                    },
                    {
                        description: '노란 점 방문 완료!',
                        check: function (s, t, m) { return m._currentWaypoint >= 4; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 5: 장애물 피하기
            {
                name: '장애물 피하기',
                description: '건물들 사이를 지나 목표 지점에 도착해요!',
                timeLimit: 90,
                collectibles: [],
                _reachedGoal: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._reachedGoal = false;
                    // 목표 지점 (링)
                    var ringGeo = new THREE.TorusGeometry(1.5, 0.1, 8, 20);
                    var ringMat = new THREE.MeshBasicMaterial({ color: 0x44ff88 });
                    var ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(20, 6, 0);
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
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
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
                            var dx = state.position.x - 20;
                            var dy = state.position.y - 6;
                            var dz = state.position.z - 0;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2) mission._reachedGoal = true;
                            return mission._reachedGoal;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 6: 링 통과하기
            {
                name: '링 통과하기',
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
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
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

            // 미션 7: 착륙 패드 찾기
            {
                name: '착륙 패드 찾기',
                description: '파란색 착륙 패드를 찾아서 착륙해요!',
                timeLimit: 90,
                collectibles: [],
                setup: function (scene) {
                    this.collectibles = [];
                    // 파란색 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0x4444ff });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(15, 0.05, 15);
                    scene.add(pad);
                    this.collectibles.push(pad);

                    // H 마크
                    var hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    var vBarGeo = new THREE.PlaneGeometry(0.2, 1.2);
                    [-0.4, 0.4].forEach(function (x) {
                        var bar = new THREE.Mesh(vBarGeo, hMat);
                        bar.rotation.x = -Math.PI / 2;
                        bar.position.set(15 + x, 0.12, 15);
                        scene.add(bar);
                    });
                    var hBarGeo = new THREE.PlaneGeometry(0.8, 0.2);
                    var hBar = new THREE.Mesh(hBarGeo, hMat);
                    hBar.rotation.x = -Math.PI / 2;
                    hBar.position.set(15, 0.12, 15);
                    scene.add(hBar);
                    this.collectibles.push(hBar);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                objectives: [
                    {
                        description: '이륙해서 10m 높이까지 올라가기',
                        check: function (state) { return state.altitude > 10; }
                    },
                    {
                        description: '착륙 패드 위로 이동하기 (3m 이내)',
                        _above: false,
                        check: function (state) {
                            var dx = state.position.x - 15;
                            var dz = state.position.z - 15;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < 3) this._above = true;
                            return this._above;
                        }
                    },
                    {
                        description: '착륙 패드에 정확히 착륙! (2m 이내)',
                        check: function (state) {
                            var dx = state.position.x - 15;
                            var dz = state.position.z - 15;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            return !state.isFlying && state.altitude < 0.3 && dist < 2;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 50; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 8: 자유 탐험
            {
                name: '자유 탐험',
                description: '세 개의 다른 지점을 자유롭게 방문해요!',
                timeLimit: 120,
                collectibles: [],
                _visited: [],
                setup: function (scene) {
                    this.collectibles = [];
                    this._visited = [];
                    var locations = [
                        { x: 20, y: 6, z: 20, color: 0xff4444 },
                        { x: -20, y: 8, z: 20, color: 0x44ff44 },
                        { x: 20, y: 5, z: -20, color: 0x4444ff },
                        { x: -20, y: 7, z: -20, color: 0xffff44 }
                    ];
                    var self = this;
                    locations.forEach(function (loc, i) {
                        // 마커
                        var geo = new THREE.SphereGeometry(0.6, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: loc.color,
                            transparent: true,
                            opacity: 0.8
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(loc.x, loc.y, loc.z);
                        marker.userData.index = i;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        // 빛 효과
                        var glowGeo = new THREE.SphereGeometry(1, 16, 16);
                        var glowMat = new THREE.MeshBasicMaterial({
                            color: loc.color,
                            transparent: true,
                            opacity: 0.2
                        });
                        var glow = new THREE.Mesh(glowGeo, glowMat);
                        glow.position.set(loc.x, loc.y, loc.z);
                        scene.add(glow);
                        self.collectibles.push(glow);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var self = this;
                    for (var i = 0; i < 4; i++) {
                        if (this._visited.indexOf(i) !== -1) continue;
                        var marker = this.collectibles[i * 2];
                        var dx = state.position.x - marker.position.x;
                        var dy = state.position.y - marker.position.y;
                        var dz = state.position.z - marker.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 2.5) {
                            this._visited.push(i);
                            marker.material.opacity = 0.2;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 지점 방문',
                        check: function (s, t, m) { return m._visited.length >= 1; }
                    },
                    {
                        description: '두 번째 지점 방문',
                        check: function (s, t, m) { return m._visited.length >= 2; }
                    },
                    {
                        description: '세 번째 지점 방문 완료!',
                        check: function (s, t, m) { return m._visited.length >= 3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 9: 느리게 비행
            {
                name: '느리게 비행',
                description: '속도를 2 이하로 유지하며 목표지점까지 이동해요!',
                timeLimit: 60,
                collectibles: [],
                _speedViolation: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._speedViolation = false;
                    // 목표 마커
                    var geo = new THREE.SphereGeometry(0.8, 16, 16);
                    var mat = new THREE.MeshStandardMaterial({
                        color: 0x44ff88,
                        emissive: 0x44ff88,
                        emissiveIntensity: 0.3
                    });
                    var marker = new THREE.Mesh(geo, mat);
                    marker.position.set(15, 3, 15);
                    scene.add(marker);
                    this.collectibles.push(marker);

                    // 기둥
                    var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, 3, 8);
                    var poleMat = new THREE.MeshPhongMaterial({ color: 0x44ff88 });
                    var pole = new THREE.Mesh(poleGeo, poleMat);
                    pole.position.set(15, 1.5, 15);
                    scene.add(pole);
                    this.collectibles.push(pole);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    var speed = Math.sqrt(
                        state.velocity.x * state.velocity.x +
                        state.velocity.y * state.velocity.y +
                        state.velocity.z * state.velocity.z
                    );
                    if (speed > 5) {
                        this._speedViolation = true;
                    }
                },
                objectives: [
                    {
                        description: '이륙하기',
                        check: function (state) { return state.altitude > 2; }
                    },
                    {
                        description: '목표지점 근처로 이동 (3m 이내)',
                        check: function (state) {
                            var dx = state.position.x - 15;
                            var dy = state.position.y - 3;
                            var dz = state.position.z - 15;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            return dist < 3;
                        }
                    },
                    {
                        description: '속도 위반 없이 완료',
                        check: function (state, time, mission) {
                            var dx = state.position.x - 15;
                            var dy = state.position.y - 3;
                            var dz = state.position.z - 15;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            return dist < 3 && !mission._speedViolation;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 40; },
                    threeStar: function (time) { return time < 30; }
                }
            },

            // 미션 10: 지그재그 비행
            {
                name: '지그재그 비행',
                description: '3개의 체크포인트를 순서대로 통과해요!',
                timeLimit: 90,
                collectibles: [],
                _currentCheckpoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentCheckpoint = 0;
                    var checkpoints = [
                        { x: 10, y: 3, z: 0 },
                        { x: -10, y: 3, z: 15 },
                        { x: 10, y: 3, z: 30 }
                    ];
                    var colors = [0xff4444, 0x44ff44, 0x4444ff];
                    var self = this;
                    checkpoints.forEach(function (pos, i) {
                        // 체크포인트 마커
                        var geo = new THREE.SphereGeometry(0.7, 16, 16);
                        var mat = new THREE.MeshStandardMaterial({
                            color: colors[i],
                            emissive: colors[i],
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        marker.userData.index = i;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, pos.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: colors[i] });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentCheckpoint >= 3) return;
                    var checkpoint = this.collectibles[this._currentCheckpoint * 2];
                    var dx = state.position.x - checkpoint.position.x;
                    var dy = state.position.y - checkpoint.position.y;
                    var dz = state.position.z - checkpoint.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 4) {
                        checkpoint.material.opacity = 0.15;
                        this._currentCheckpoint++;
                        if (this._currentCheckpoint < 3) {
                            this.collectibles[this._currentCheckpoint * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 체크포인트 통과',
                        check: function (s, t, m) { return m._currentCheckpoint >= 1; }
                    },
                    {
                        description: '두 번째 체크포인트 통과',
                        check: function (s, t, m) { return m._currentCheckpoint >= 2; }
                    },
                    {
                        description: '세 번째 체크포인트 통과 완료!',
                        check: function (s, t, m) { return m._currentCheckpoint >= 3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 11: 높이 맞추기
            {
                name: '높이 맞추기',
                description: '표시된 높이(5m, 8m, 3m)에 차례로 맞춰요!',
                timeLimit: 60,
                collectibles: [],
                _currentTarget: 0,
                _holdStartTime: null,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentTarget = 0;
                    this._holdStartTime = null;
                    var heights = [5, 8, 3];
                    var colors = [0xff4444, 0x44ff44, 0x4444ff];
                    var self = this;
                    heights.forEach(function (h, i) {
                        // 높이 표시 링
                        var ringGeo = new THREE.TorusGeometry(2, 0.1, 8, 32);
                        var mat = new THREE.MeshBasicMaterial({
                            color: colors[i],
                            transparent: true,
                            opacity: i === 0 ? 0.8 : 0.2
                        });
                        var ring = new THREE.Mesh(ringGeo, mat);
                        ring.position.set(0, h, 0);
                        ring.rotation.x = Math.PI / 2;
                        ring.userData.height = h;
                        ring.userData.index = i;
                        scene.add(ring);
                        self.collectibles.push(ring);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state, time) {
                    if (this._currentTarget >= 3) return;
                    var ring = this.collectibles[this._currentTarget];
                    var targetHeight = ring.userData.height;
                    var heightDiff = Math.abs(state.position.y - targetHeight);

                    if (heightDiff < 0.5) {
                        if (!this._holdStartTime) {
                            this._holdStartTime = time;
                        } else if (time - this._holdStartTime > 2) {
                            ring.material.opacity = 0.1;
                            this._currentTarget++;
                            this._holdStartTime = null;
                            if (this._currentTarget < 3) {
                                this.collectibles[this._currentTarget].material.opacity = 0.8;
                            }
                        }
                    } else {
                        this._holdStartTime = null;
                    }
                },
                objectives: [
                    {
                        description: '5m 높이 유지 (2초)',
                        check: function (s, t, m) { return m._currentTarget >= 1; }
                    },
                    {
                        description: '8m 높이 유지 (2초)',
                        check: function (s, t, m) { return m._currentTarget >= 2; }
                    },
                    {
                        description: '3m 높이 유지 완료!',
                        check: function (s, t, m) { return m._currentTarget >= 3; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 40; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 12: 원 비행
            {
                name: '원 비행',
                description: '중심점 주위로 원을 그리며 비행해요!',
                timeLimit: 90,
                collectibles: [],
                _currentPoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentPoint = 0;
                    var points = [
                        { x: 15, y: 3, z: 0 },
                        { x: 0, y: 3, z: 15 },
                        { x: -15, y: 3, z: 0 },
                        { x: 0, y: 3, z: -15 }
                    ];
                    var colors = [0xff4444, 0x44ff44, 0x4444ff, 0xffff44];
                    var self = this;
                    points.forEach(function (pos, i) {
                        // 포인트 마커
                        var geo = new THREE.SphereGeometry(0.6, 16, 16);
                        var mat = new THREE.MeshStandardMaterial({
                            color: colors[i],
                            emissive: colors[i],
                            emissiveIntensity: 0.3,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        marker.userData.index = i;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, pos.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: colors[i] });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });

                    // 중심 마커
                    var centerGeo = new THREE.SphereGeometry(0.3, 16, 16);
                    var centerMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    var center = new THREE.Mesh(centerGeo, centerMat);
                    center.position.set(0, 3, 0);
                    scene.add(center);
                    this.collectibles.push(center);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentPoint >= 4) return;
                    var point = this.collectibles[this._currentPoint * 2];
                    var dx = state.position.x - point.position.x;
                    var dy = state.position.y - point.position.y;
                    var dz = state.position.z - point.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 5) {
                        point.material.opacity = 0.15;
                        this._currentPoint++;
                        if (this._currentPoint < 4) {
                            this.collectibles[this._currentPoint * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째, 두 번째 포인트 방문',
                        check: function (s, t, m) { return m._currentPoint >= 2; }
                    },
                    {
                        description: '세 번째 포인트 방문',
                        check: function (s, t, m) { return m._currentPoint >= 3; }
                    },
                    {
                        description: '원 완성!',
                        check: function (s, t, m) { return m._currentPoint >= 4; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 40; }
                }
            },

            // 미션 13: 비상 착륙
            {
                name: '비상 착륙',
                description: '높이 10m에서 출발, 착륙 패드에 안전하게 착륙해요!',
                timeLimit: 30,
                collectibles: [],
                setup: function (scene) {
                    this.collectibles = [];
                    // 착륙 패드 (빨간색)
                    var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xff4444 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(20, 0.05, 20);
                    scene.add(pad);
                    this.collectibles.push(pad);

                    // H 마크
                    var hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    var vBarGeo = new THREE.PlaneGeometry(0.3, 1.5);
                    [-0.5, 0.5].forEach(function (x) {
                        var bar = new THREE.Mesh(vBarGeo, hMat);
                        bar.rotation.x = -Math.PI / 2;
                        bar.position.set(20 + x, 0.12, 20);
                        scene.add(bar);
                    });
                    var hBarGeo = new THREE.PlaneGeometry(1, 0.3);
                    var hBar = new THREE.Mesh(hBarGeo, hMat);
                    hBar.rotation.x = -Math.PI / 2;
                    hBar.position.set(20, 0.12, 20);
                    scene.add(hBar);
                    this.collectibles.push(hBar);

                    // 경고 마커
                    var warningGeo = new THREE.SphereGeometry(0.5, 16, 16);
                    var warningMat = new THREE.MeshBasicMaterial({
                        color: 0xff4444,
                        transparent: true,
                        opacity: 0.5
                    });
                    var warning = new THREE.Mesh(warningGeo, warningMat);
                    warning.position.set(20, 10, 20);
                    scene.add(warning);
                    this.collectibles.push(warning);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                objectives: [
                    {
                        description: '10m 높이까지 올라가기',
                        check: function (state) { return state.altitude > 10; }
                    },
                    {
                        description: '착륙 패드 근처로 이동 (3m 이내)',
                        _above: false,
                        check: function (state) {
                            var dx = state.position.x - 20;
                            var dz = state.position.z - 20;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < 3) this._above = true;
                            return this._above;
                        }
                    },
                    {
                        description: '착륙 패드에 안전하게 착륙!',
                        check: function (state) {
                            var dx = state.position.x - 20;
                            var dz = state.position.z - 20;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            return !state.isFlying && state.altitude < 0.3 && dist < 3;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 20; },
                    threeStar: function (time) { return time < 15; }
                }
            },

            // 미션 14: 별 모양 비행
            {
                name: '별 모양 비행',
                description: '별 모양의 5개 꼭짓점을 순서대로 방문해요!',
                timeLimit: 120,
                collectibles: [],
                _currentStar: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentStar = 0;
                    // 별 모양 5개 포인트 (오각별)
                    var radius = 15;
                    var points = [];
                    for (var i = 0; i < 5; i++) {
                        var angle = (i * 144 - 90) * Math.PI / 180; // 144도씩 (5각별)
                        points.push({
                            x: radius * Math.cos(angle),
                            y: 4,
                            z: radius * Math.sin(angle)
                        });
                    }
                    var colors = [0xff0000, 0xff8800, 0xffff00, 0x00ff00, 0x0088ff];
                    var self = this;
                    points.forEach(function (pos, i) {
                        // 별 꼭짓점 마커
                        var geo = new THREE.SphereGeometry(0.7, 16, 16);
                        var mat = new THREE.MeshStandardMaterial({
                            color: colors[i],
                            emissive: colors[i],
                            emissiveIntensity: 0.4,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        marker.userData.index = i;
                        scene.add(marker);
                        self.collectibles.push(marker);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, pos.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: colors[i] });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(pos.x, pos.y / 2, pos.z);
                        scene.add(pole);
                        self.collectibles.push(pole);
                    });
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                frameUpdate: function (state) {
                    if (this._currentStar >= 5) return;
                    var star = this.collectibles[this._currentStar * 2];
                    var dx = state.position.x - star.position.x;
                    var dy = state.position.y - star.position.y;
                    var dz = state.position.z - star.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 4) {
                        star.material.opacity = 0.15;
                        this._currentStar++;
                        if (this._currentStar < 5) {
                            this.collectibles[this._currentStar * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째, 두 번째 별 방문',
                        check: function (s, t, m) { return m._currentStar >= 2; }
                    },
                    {
                        description: '세 번째, 네 번째 별 방문',
                        check: function (s, t, m) { return m._currentStar >= 4; }
                    },
                    {
                        description: '별 모양 완성!',
                        check: function (s, t, m) { return m._currentStar >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 80; },
                    threeStar: function (time) { return time < 60; }
                }
            },

            // 미션 15: 종합 시험
            {
                name: '종합 시험',
                description: '이륙 → 고도 5m → 전진 → 링 통과 → 착륙!',
                timeLimit: 90,
                collectibles: [],
                setup: function (scene) {
                    this.collectibles = [];
                    // 목표 링
                    var ringGeo = new THREE.TorusGeometry(1.8, 0.15, 8, 24);
                    var ringMat = new THREE.MeshBasicMaterial({ color: 0xffaa00 });
                    var ring = new THREE.Mesh(ringGeo, ringMat);
                    ring.position.set(20, 5, 0);
                    ring.rotation.y = Math.PI / 2;
                    scene.add(ring);
                    this.collectibles.push(ring);

                    // 링 빛 효과
                    var glowGeo = new THREE.TorusGeometry(1.8, 0.3, 8, 24);
                    var glowMat = new THREE.MeshBasicMaterial({
                        color: 0xffaa00,
                        transparent: true,
                        opacity: 0.3
                    });
                    var glow = new THREE.Mesh(glowGeo, glowMat);
                    glow.position.copy(ring.position);
                    glow.rotation.copy(ring.rotation);
                    scene.add(glow);
                    this.collectibles.push(glow);

                    // 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(2, 2, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0x44ff44 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(25, 0.05, 0);
                    scene.add(pad);
                    this.collectibles.push(pad);

                    // H 마크
                    var hMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
                    var vBarGeo = new THREE.PlaneGeometry(0.2, 1.2);
                    [-0.4, 0.4].forEach(function (x) {
                        var bar = new THREE.Mesh(vBarGeo, hMat);
                        bar.rotation.x = -Math.PI / 2;
                        bar.position.set(25 + x, 0.12, 0);
                        scene.add(bar);
                    });
                    var hBarGeo = new THREE.PlaneGeometry(0.8, 0.2);
                    var hBar = new THREE.Mesh(hBarGeo, hMat);
                    hBar.rotation.x = -Math.PI / 2;
                    hBar.position.set(25, 0.12, 0);
                    scene.add(hBar);
                    this.collectibles.push(hBar);
                },
                cleanup: function (scene) {
                    this.collectibles.forEach(function (obj) {
                        scene.remove(obj);
                        if (obj.geometry) obj.geometry.dispose();
                        if (obj.material) {
                            if (Array.isArray(obj.material)) {
                                obj.material.forEach(function (m) { m.dispose(); });
                            } else {
                                obj.material.dispose();
                            }
                        }
                    });
                    this.collectibles = [];
                },
                objectives: [
                    {
                        description: '고도 5m 도달',
                        check: function (state) { return state.altitude > 5; }
                    },
                    {
                        description: '링 근처 도달 (20, 5, 0)',
                        check: function (state) {
                            var dx = state.position.x - 20;
                            var dy = state.position.y - 5;
                            var dz = state.position.z - 0;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            return dist < 3;
                        }
                    },
                    {
                        description: '착륙 패드에 착륙!',
                        check: function (state) {
                            var dx = state.position.x - 25;
                            var dz = state.position.z - 0;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            return !state.isFlying && state.altitude < 0.3 && dist < 2;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 60; },
                    threeStar: function (time) { return time < 40; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createLowMissions = createLowMissions;
})();
