/**
 * 고학년 미션 정의 (10개)
 * 더 복잡하고 도전적인 미션으로 드론 조종 실력을 키웁니다.
 */
(function () {
    'use strict';

    function createHighMissions() {
        return [
            // 미션 1: 이륙과 착륙
            {
                name: '이륙과 착륙',
                description: '드론의 기본! 안전하게 이륙하고 착륙하세요.',
                timeLimit: 60,
                objectives: [
                    {
                        description: '5m 높이까지 이륙',
                        check: function (state) { return state.altitude > 5; }
                    },
                    {
                        description: '10초 동안 호버링',
                        _hoverStart: null,
                        check: function (state, time) {
                            if (state.altitude > 4 && state.altitude < 6) {
                                if (!this._hoverStart) this._hoverStart = time;
                                return time - this._hoverStart > 10;
                            }
                            this._hoverStart = null;
                            return false;
                        }
                    },
                    {
                        description: '부드럽게 착륙 (1.5m 이내)',
                        check: function (state) {
                            var dist = Math.sqrt(state.position.x * state.position.x + state.position.z * state.position.z);
                            return !state.isFlying && state.altitude < 0.3 && dist < 1.5;
                        }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 35; },
                    threeStar: function (time) { return time < 20; }
                }
            },

            // 미션 2: 정밀 비행
            {
                name: '정밀 비행',
                description: '정확한 좌표로 이동하는 능력을 키워요.',
                timeLimit: 90,
                collectibles: [],
                _currentTarget: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentTarget = 0;
                    var targets = [
                        { x: 10, y: 5, z: 0 },
                        { x: 10, y: 10, z: 10 },
                        { x: 0, y: 8, z: 10 },
                        { x: -10, y: 6, z: 0 },
                        { x: 0, y: 4, z: -10 }
                    ];
                    var self = this;
                    targets.forEach(function (pos, i) {
                        // 타겟 구
                        var geo = new THREE.SphereGeometry(0.4, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0x00aaff,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.25
                        });
                        var target = new THREE.Mesh(geo, mat);
                        target.position.set(pos.x, pos.y, pos.z);
                        scene.add(target);
                        self.collectibles.push(target);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.03, 0.03, pos.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: 0x00aaff });
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
                    if (this._currentTarget >= 5) return;
                    var target = this.collectibles[this._currentTarget * 2];
                    var dx = state.position.x - target.position.x;
                    var dy = state.position.y - target.position.y;
                    var dz = state.position.z - target.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 1.5) {
                        target.material.opacity = 0.1;
                        this._currentTarget++;
                        if (this._currentTarget < 5) {
                            this.collectibles[this._currentTarget * 2].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째, 두 번째 좌표 방문',
                        check: function (s, t, m) { return m._currentTarget >= 2; }
                    },
                    {
                        description: '세 번째, 네 번째 좌표 방문',
                        check: function (s, t, m) { return m._currentTarget >= 4; }
                    },
                    {
                        description: '모든 좌표 방문 완료!',
                        check: function (s, t, m) { return m._currentTarget >= 5; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 55; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 3: 고도 유지
            {
                name: '고도 유지',
                description: '일정한 높이를 유지하며 이동하세요.',
                timeLimit: 90,
                collectibles: [],
                _passedCheckpoints: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passedCheckpoints = 0;
                    var checkpoints = [
                        { x: 0, z: 0 },
                        { x: 15, z: 0 },
                        { x: 15, z: 15 },
                        { x: 0, z: 15 }
                    ];
                    var self = this;
                    checkpoints.forEach(function (pos, i) {
                        // 체크포인트 링 (높이 8m)
                        var geo = new THREE.TorusGeometry(1.5, 0.1, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xffaa00,
                            transparent: true,
                            opacity: 0.6
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, 8, pos.z);
                        ring.rotation.x = Math.PI / 2;
                        ring.userData.passed = false;
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
                    this.collectibles.forEach(function (ring) {
                        if (ring.userData.passed) return;
                        var dx = state.position.x - ring.position.x;
                        var dy = state.position.y - ring.position.y;
                        var dz = state.position.z - ring.position.z;
                        var dist = Math.sqrt(dx * dx + dz * dz);
                        if (dist < 2 && Math.abs(dy) < 1.5) {
                            ring.userData.passed = true;
                            ring.material.opacity = 0.15;
                            self._passedCheckpoints++;
                        }
                    });
                },
                objectives: [
                    {
                        description: '8m 고도로 이륙',
                        check: function (state) { return state.altitude > 7.5 && state.altitude < 8.5; }
                    },
                    {
                        description: '첫 번째, 두 번째 체크포인트 통과',
                        check: function (s, t, m) { return m._passedCheckpoints >= 2; }
                    },
                    {
                        description: '모든 체크포인트 통과!',
                        check: function (s, t, m) { return m._passedCheckpoints >= 4; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 55; },
                    threeStar: function (time) { return time < 35; }
                }
            },

            // 미션 4: 8자 비행
            {
                name: '8자 비행',
                description: '8자 모양으로 비행하며 모든 체크포인트를 통과하세요!',
                timeLimit: 120,
                collectibles: [],
                _currentCheckpoint: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._currentCheckpoint = 0;
                    // 8자 패턴 포인트
                    var points = [
                        { x: 0, y: 5, z: 0 },
                        { x: 5, y: 6, z: 5 },
                        { x: 7, y: 7, z: 0 },
                        { x: 5, y: 6, z: -5 },
                        { x: 0, y: 5, z: 0 },
                        { x: -5, y: 6, z: 5 },
                        { x: -7, y: 7, z: 0 },
                        { x: -5, y: 6, z: -5 }
                    ];
                    var self = this;
                    points.forEach(function (pos, i) {
                        var geo = new THREE.SphereGeometry(0.5, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff00ff,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(pos.x, pos.y, pos.z);
                        scene.add(marker);
                        self.collectibles.push(marker);
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
                    if (this._currentCheckpoint >= 8) return;
                    var marker = this.collectibles[this._currentCheckpoint];
                    var dx = state.position.x - marker.position.x;
                    var dy = state.position.y - marker.position.y;
                    var dz = state.position.z - marker.position.z;
                    var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                    if (dist < 2) {
                        marker.material.opacity = 0.1;
                        this._currentCheckpoint++;
                        if (this._currentCheckpoint < 8) {
                            this.collectibles[this._currentCheckpoint].material.opacity = 1;
                        }
                    }
                },
                objectives: [
                    {
                        description: '첫 번째 원 완성 (4개 포인트)',
                        check: function (s, t, m) { return m._currentCheckpoint >= 4; }
                    },
                    {
                        description: '두 번째 원 절반 (6개 포인트)',
                        check: function (s, t, m) { return m._currentCheckpoint >= 6; }
                    },
                    {
                        description: '8자 패턴 완성!',
                        check: function (s, t, m) { return m._currentCheckpoint >= 8; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 5: 장애물 코스
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
                        (state.position.x - 28) * (state.position.x - 28) +
                        (state.position.y - 6) * (state.position.y - 6) +
                        state.position.z * state.position.z
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

            // 미션 6: 링 레이스
            {
                name: '링 레이스',
                description: '모든 링을 빠르게 통과하세요! 시간이 촉박해요!',
                timeLimit: 50,
                collectibles: [],
                _passed: 0,
                setup: function (scene) {
                    this.collectibles = [];
                    this._passed = 0;
                    var positions = [
                        { x: 8, y: 5, z: 0, rx: 0, ry: Math.PI / 2 },
                        { x: 15, y: 7, z: 8, rx: 0, ry: 0 },
                        { x: 8, y: 9, z: 15, rx: 0, ry: -Math.PI / 4 },
                        { x: -5, y: 6, z: 15, rx: 0, ry: Math.PI / 2 },
                        { x: -10, y: 8, z: 5, rx: 0, ry: Math.PI / 4 },
                        { x: 0, y: 4, z: 0, rx: Math.PI / 2, ry: 0 }
                    ];
                    var self = this;
                    positions.forEach(function (pos, i) {
                        var geo = new THREE.TorusGeometry(1.5, 0.12, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff0088,
                            transparent: true,
                            opacity: i === 0 ? 1 : 0.3
                        });
                        var ring = new THREE.Mesh(geo, mat);
                        ring.position.set(pos.x, pos.y, pos.z);
                        ring.rotation.x = pos.rx;
                        ring.rotation.y = pos.ry;
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
                    if (this._passed >= this.collectibles.length) return;
                    var ring = this.collectibles[this._passed];
                    var dist = Math.sqrt(
                        (state.position.x - ring.position.x) * (state.position.x - ring.position.x) +
                        (state.position.y - ring.position.y) * (state.position.y - ring.position.y) +
                        (state.position.z - ring.position.z) * (state.position.z - ring.position.z)
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
                        description: '링 1, 2 통과',
                        check: function (s, t, m) { return m._passed >= 2; }
                    },
                    {
                        description: '링 3, 4, 5 통과',
                        check: function (s, t, m) { return m._passed >= 5; }
                    },
                    {
                        description: '모든 링 통과 - 완주!',
                        check: function (s, t, m) { return m._passed >= 6; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 35; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 7: 택배 배달
            {
                name: '택배 배달',
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
                    box.position.set(15, 0.4, 15);
                    scene.add(box);
                    this.collectibles.push(box);
                    this._cargo = box;
                    // A 지점 마커
                    var markerA = this._createMarker(scene, 15, 15, 0x44ff88, 'A');
                    this.collectibles.push(markerA);
                    // B 지점 마커
                    var markerB = this._createMarker(scene, -20, -15, 0xff4444, 'B');
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
                    // 화물 픽업
                    if (!this._pickedUp) {
                        var dist = Math.sqrt(
                            (state.position.x - 15) * (state.position.x - 15) +
                            (state.position.y - 2) * (state.position.y - 2) +
                            (state.position.z - 15) * (state.position.z - 15)
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
                            (state.position.x + 20) * (state.position.x + 20) +
                            (state.position.z + 15) * (state.position.z + 15)
                        );
                        if (dist2 < 3 && state.altitude < 3) {
                            this._delivered = true;
                            if (this._cargo) {
                                this._cargo.position.set(-20, 0.4, -15);
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
                                (state.position.x + 20) * (state.position.x + 20) +
                                (state.position.z + 15) * (state.position.z + 15)
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

            // 미션 8: 정찰 비행
            {
                name: '정찰 비행',
                description: '모든 정찰 포인트를 방문하고 출발 지점으로 돌아오세요.',
                timeLimit: 120,
                collectibles: [],
                _visitedCount: 0,
                _returnedHome: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._visitedCount = 0;
                    this._returnedHome = false;
                    var scoutPoints = [
                        { x: 20, y: 6, z: 20, color: 0xff4444 },
                        { x: -20, y: 8, z: 20, color: 0x44ff44 },
                        { x: -20, y: 7, z: -20, color: 0x4444ff },
                        { x: 20, y: 5, z: -20, color: 0xffff44 }
                    ];
                    var self = this;
                    scoutPoints.forEach(function (point, i) {
                        // 정찰 포인트
                        var geo = new THREE.ConeGeometry(0.5, 1.5, 8);
                        var mat = new THREE.MeshBasicMaterial({
                            color: point.color,
                            transparent: true,
                            opacity: 0.8
                        });
                        var cone = new THREE.Mesh(geo, mat);
                        cone.position.set(point.x, point.y, point.z);
                        cone.userData.visited = false;
                        scene.add(cone);
                        self.collectibles.push(cone);

                        // 기둥
                        var poleGeo = new THREE.CylinderGeometry(0.05, 0.05, point.y, 8);
                        var poleMat = new THREE.MeshPhongMaterial({ color: point.color });
                        var pole = new THREE.Mesh(poleGeo, poleMat);
                        pole.position.set(point.x, point.y / 2, point.z);
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
                    var self = this;
                    // 정찰 포인트 체크
                    for (var i = 0; i < 4; i++) {
                        var cone = this.collectibles[i * 2];
                        if (cone.userData.visited) continue;
                        var dx = state.position.x - cone.position.x;
                        var dy = state.position.y - cone.position.y;
                        var dz = state.position.z - cone.position.z;
                        var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                        if (dist < 2.5) {
                            cone.userData.visited = true;
                            cone.material.opacity = 0.2;
                            this._visitedCount++;
                        }
                    }
                    // 귀환 체크
                    if (this._visitedCount >= 4) {
                        var homeDist = Math.sqrt(
                            state.position.x * state.position.x +
                            state.position.z * state.position.z
                        );
                        if (homeDist < 3) {
                            this._returnedHome = true;
                        }
                    }
                },
                objectives: [
                    {
                        description: '정찰 포인트 2개 방문',
                        check: function (s, t, m) { return m._visitedCount >= 2; }
                    },
                    {
                        description: '모든 정찰 포인트 방문',
                        check: function (s, t, m) { return m._visitedCount >= 4; }
                    },
                    {
                        description: '출발 지점으로 귀환!',
                        check: function (s, t, m) { return m._returnedHome; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 70; },
                    threeStar: function (time) { return time < 45; }
                }
            },

            // 미션 9: 긴급 착륙
            {
                name: '긴급 착륙',
                description: '가장 가까운 착륙 패드를 찾아 안전하게 착륙하세요!',
                timeLimit: 60,
                collectibles: [],
                _landedCorrectly: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._landedCorrectly = false;
                    // 여러 착륙 패드
                    var pads = [
                        { x: 25, z: 25, color: 0xff4444 },
                        { x: -25, z: 25, color: 0x44ff44 },
                        { x: 25, z: -25, color: 0x4444ff },
                        { x: -25, z: -25, color: 0xffff44 }
                    ];
                    var self = this;
                    pads.forEach(function (pad) {
                        var padGeo = new THREE.CylinderGeometry(2.5, 2.5, 0.1, 32);
                        var padMat = new THREE.MeshPhongMaterial({ color: pad.color });
                        var mesh = new THREE.Mesh(padGeo, padMat);
                        mesh.position.set(pad.x, 0.05, pad.z);
                        mesh.userData.isPad = true;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
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
                    if (this._landedCorrectly) return;
                    if (!state.isFlying && state.altitude < 0.3) {
                        var self = this;
                        this.collectibles.forEach(function (pad) {
                            if (!pad.userData.isPad) return;
                            var dx = state.position.x - pad.position.x;
                            var dz = state.position.z - pad.position.z;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (dist < 2.5) {
                                self._landedCorrectly = true;
                            }
                        });
                    }
                },
                objectives: [
                    {
                        description: '15m 높이까지 이륙',
                        check: function (state) { return state.altitude > 15; }
                    },
                    {
                        description: '착륙 패드 찾기',
                        _foundPad: false,
                        check: function (state, t, mission) {
                            for (var i = 0; i < mission.collectibles.length; i++) {
                                var pad = mission.collectibles[i];
                                if (!pad.userData.isPad) continue;
                                var dx = state.position.x - pad.position.x;
                                var dz = state.position.z - pad.position.z;
                                var dist = Math.sqrt(dx * dx + dz * dz);
                                if (dist < 5 && state.altitude < 10) {
                                    this._foundPad = true;
                                    return true;
                                }
                            }
                            return false;
                        }
                    },
                    {
                        description: '착륙 패드에 안전하게 착륙!',
                        check: function (s, t, m) { return m._landedCorrectly; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 40; },
                    threeStar: function (time) { return time < 25; }
                }
            },

            // 미션 10: 자율비행 과제
            {
                name: '자율비행 과제',
                description: '복잡한 코스를 완주하세요! 모든 기술을 활용해야 합니다.',
                timeLimit: 150,
                collectibles: [],
                _checkpointsPassed: 0,
                _ringsPass: 0,
                _landed: false,
                setup: function (scene) {
                    this.collectibles = [];
                    this._checkpointsPassed = 0;
                    this._ringsPassed = 0;
                    this._landed = false;

                    // 체크포인트
                    var checkpoints = [
                        { x: 10, y: 5, z: 0, color: 0xff4444 },
                        { x: 15, y: 10, z: 10, color: 0x44ff44 },
                        { x: 0, y: 12, z: 20, color: 0x4444ff }
                    ];
                    var self = this;
                    checkpoints.forEach(function (cp, i) {
                        var geo = new THREE.SphereGeometry(0.6, 16, 16);
                        var mat = new THREE.MeshBasicMaterial({
                            color: cp.color,
                            transparent: true,
                            opacity: 0.8
                        });
                        var marker = new THREE.Mesh(geo, mat);
                        marker.position.set(cp.x, cp.y, cp.z);
                        marker.userData.passed = false;
                        marker.userData.isCheckpoint = true;
                        scene.add(marker);
                        self.collectibles.push(marker);
                    });

                    // 링
                    var rings = [
                        { x: -10, y: 8, z: 20, ry: Math.PI / 2 },
                        { x: -15, y: 6, z: 10, ry: 0 }
                    ];
                    rings.forEach(function (ring) {
                        var geo = new THREE.TorusGeometry(1.8, 0.15, 8, 24);
                        var mat = new THREE.MeshBasicMaterial({
                            color: 0xff00ff,
                            transparent: true,
                            opacity: 0.7
                        });
                        var mesh = new THREE.Mesh(geo, mat);
                        mesh.position.set(ring.x, ring.y, ring.z);
                        mesh.rotation.y = ring.ry;
                        mesh.userData.passed = false;
                        mesh.userData.isRing = true;
                        scene.add(mesh);
                        self.collectibles.push(mesh);
                    });

                    // 최종 착륙 패드
                    var padGeo = new THREE.CylinderGeometry(3, 3, 0.1, 32);
                    var padMat = new THREE.MeshPhongMaterial({ color: 0xffd700 });
                    var pad = new THREE.Mesh(padGeo, padMat);
                    pad.position.set(-5, 0.05, 0);
                    pad.userData.isLandingPad = true;
                    scene.add(pad);
                    this.collectibles.push(pad);
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
                    this.collectibles.forEach(function (obj) {
                        if (obj.userData.isCheckpoint && !obj.userData.passed) {
                            var dx = state.position.x - obj.position.x;
                            var dy = state.position.y - obj.position.y;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2) {
                                obj.userData.passed = true;
                                obj.material.opacity = 0.2;
                                self._checkpointsPassed++;
                            }
                        }
                        if (obj.userData.isRing && !obj.userData.passed) {
                            var dx = state.position.x - obj.position.x;
                            var dy = state.position.y - obj.position.y;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
                            if (dist < 2.5) {
                                obj.userData.passed = true;
                                obj.material.opacity = 0.2;
                                self._ringsPassed++;
                            }
                        }
                        if (obj.userData.isLandingPad && !self._landed) {
                            var dx = state.position.x - obj.position.x;
                            var dz = state.position.z - obj.position.z;
                            var dist = Math.sqrt(dx * dx + dz * dz);
                            if (!state.isFlying && state.altitude < 0.3 && dist < 3) {
                                self._landed = true;
                            }
                        }
                    });
                },
                objectives: [
                    {
                        description: '모든 체크포인트 통과 (3개)',
                        check: function (s, t, m) { return m._checkpointsPassed >= 3; }
                    },
                    {
                        description: '모든 링 통과 (2개)',
                        check: function (s, t, m) { return m._ringsPassed >= 2; }
                    },
                    {
                        description: '골든 착륙 패드에 착륙!',
                        check: function (s, t, m) { return m._landed; }
                    }
                ],
                starCriteria: {
                    twoStar: function (time) { return time < 90; },
                    threeStar: function (time) { return time < 60; }
                }
            }
        ];
    }

    window.DroneSim = window.DroneSim || {};
    window.DroneSim.createHighMissions = createHighMissions;
})();
