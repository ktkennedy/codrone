/**
 * 드론 시뮬레이터 앱
 * Three.js 씬 구성, 게임 루프, 키보드 조작, 미션 시스템
 */
(function () {
    'use strict';

    // 모듈을 안전하게 가져오기
    var DS = window.DroneSim || {};
    var DronePhysics = DS.DronePhysics;
    var DroneModel = DS.DroneModel;
    var World = DS.World;
    var CameraSystem = DS.CameraSystem;
    var HUD = DS.HUD;
    var MessageDisplay = DS.MessageDisplay;
    var Minimap = DS.Minimap;
    var KeyboardControls = DS.KeyboardControls;
    var MissionManager = DS.MissionManager;
    var MissionSelectUI = DS.MissionSelectUI;
    var createHighMissions = DS.createHighMissions;
    var PathOverlay = DS.PathOverlay;
    var Autopilot = DS.Autopilot;
    var WindPresets = DS.WindPresets;
    var WindSettingsPanel = DS.WindSettingsPanel;
    var PhysicsTuningPanel = DS.PhysicsTuningPanel;
    var AudioManager = DS.AudioManager;
    var OnboardingTutorial = DS.OnboardingTutorial;

    var scene, renderer, camera;
    var physics, droneModel, world, cameraSystem;
    var hud, messageDisplay, minimap, controls, pathOverlay;
    var missionManager, missionUI;
    var autopilot;
    var windPanel;
    var tuningPanel;
    var audioManager;
    var clock;
    var isStarted = false;
    var currentMissionDef = null;

    /**
     * 시뮬레이션 시작 (오버레이 숨기기)
     */
    function startSimulation() {
        var overlay = document.getElementById('tutorial-overlay');
        if (overlay) overlay.style.display = 'none';
        isStarted = true;
        window._droneStarted = true;
        if (messageDisplay) {
            messageDisplay.show('T: 이륙 | M: 미션 | V: 바람 | B: 튜닝 | H: 키 안내', 'info', 4000);
        }
    }

    // 시작 버튼 이벤트 - 가능한 한 빨리 등록
    function attachStartButton() {
        var btn = document.getElementById('btn-start');
        if (btn) {
            btn.addEventListener('click', startSimulation);
            btn.addEventListener('touchend', function (e) {
                e.preventDefault();
                startSimulation();
            });
        }
    }

    // DOM 로드 후 즉시 시작 버튼 연결
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', attachStartButton);
    } else {
        attachStartButton();
    }

    function init() {
        attachStartButton();

        scene = new THREE.Scene();
        scene.fog = new THREE.Fog(0x87ceeb, 100, 250);

        camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 500);
        camera.position.set(0, 5, 8);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.setClearColor(0x87ceeb);
        if (THREE.SRGBColorSpace) renderer.outputColorSpace = THREE.SRGBColorSpace;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        clock = new THREE.Clock();

        world = new World(scene);
        world.create();

        physics = new DronePhysics({
            maxSpeed: 15, speedLimit: 15,
            autoStabilize: true, stabilizeRate: 3.0,
            maxTiltAngle: Math.PI / 5, batteryDrainRate: 0.5, dragCoefficient: 0.3
        });

        physics.onCollision = function (speed) {
            if (audioManager) audioManager.playCollision();
            if (!messageDisplay) return;
            if (speed > 5) messageDisplay.show('강한 충돌! 주의하세요!', 'error', 2000);
            else messageDisplay.show('가벼운 충돌', 'warning', 1000);
        };
        physics.onLanded = function () {
            if (audioManager) audioManager.playLand();
            if (missionManager && missionManager.isRunning) return;
            if (!messageDisplay) return;
            var state = physics.getState();
            var distFromPad = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
            if (distFromPad < 1.5) messageDisplay.show('착륙 패드에 정확히 착륙!', 'success', 2500);
            else messageDisplay.show('착륙 완료', 'info', 1500);
        };

        droneModel = new DroneModel();
        scene.add(droneModel.getModel());

        cameraSystem = new CameraSystem(camera);
        cameraSystem.setTarget(droneModel.getModel());

        hud = new HUD();
        messageDisplay = new MessageDisplay();
        minimap = new Minimap(null, 70);

        // 경로 오버레이 + 자율비행 시스템
        if (PathOverlay) pathOverlay = new PathOverlay();
        if (Autopilot) autopilot = new Autopilot(physics);

        // 오디오 매니저
        if (AudioManager) {
            audioManager = new AudioManager();
            window._dronePhysics = physics; // 오디오 업데이트용 참조
        }

        controls = new KeyboardControls(physics);
        controls.onCameraSwitch = function () {
            cameraSystem.nextMode();
            if (hud) hud.setCameraMode(cameraSystem.getModeName());
            if (messageDisplay) messageDisplay.show('카메라: ' + cameraSystem.getModeName(), 'info', 1000);
        };
        controls.onTakeoff = function () {
            if (audioManager) audioManager.playTakeoff();
        };

        // 바람 시스템
        if (WindSettingsPanel && WindPresets) {
            windPanel = new WindSettingsPanel();
            windPanel.onPresetChange = function (preset) {
                var windProfile = WindPresets[preset] ? WindPresets[preset]() : null;
                physics.setWind(windProfile);
                if (messageDisplay) {
                    var names = { calm: '바람 없음', light: '약풍', moderate: '중풍', strong: '강풍', gusty: '돌풍', sinusoid: '변동풍' };
                    messageDisplay.show('바람: ' + (names[preset] || preset), 'info', 1500);
                }
            };
        }

        // 튜닝 패널
        if (PhysicsTuningPanel) {
            tuningPanel = new PhysicsTuningPanel(physics);
        }

        // 미션 시스템
        initMissions();

        // 온보딩 튜토리얼
        if (OnboardingTutorial) {
            var tutorial = new OnboardingTutorial({
                storageKey: 'drone-high-tutorial-complete',
                steps: [
                    { id: 'welcome', title: '드론 조종사가 되어보세요!', description: '키보드로 드론을 자유롭게 조종할 수 있어요.', icon: '🚁', buttonText: '시작하기', highlightSelector: null, waitForAction: null, position: 'center' },
                    { id: 'takeoff', title: 'T키를 눌러 이륙하세요!', description: '드론을 하늘로 띄워보세요!', icon: '🟢', buttonText: null, highlightSelector: null, waitForAction: 'keyboard_T', position: 'center' },
                    { id: 'move', title: 'WASD로 움직여보세요!', description: 'W:전진 A:좌 S:후진 D:우', icon: '🎮', buttonText: null, highlightSelector: null, waitForAction: 'keyboard_WASD', position: 'center' },
                    { id: 'altitude', title: 'Space/Shift로 높이 조절!', description: 'Space:상승 Shift:하강', icon: '⬆️', buttonText: null, highlightSelector: null, waitForAction: 'keyboard_altitude', position: 'center' },
                    { id: 'land', title: 'L키를 눌러 착륙하세요!', description: '안전하게 착륙해보세요!', icon: '🟠', buttonText: null, highlightSelector: null, waitForAction: 'keyboard_L', position: 'center' },
                    { id: 'complete', title: '잘했어요! 🎉', description: '이제 미션에 도전해볼까요? M키로 미션을 열 수 있어요!', icon: '🏆', buttonText: '미션 시작', highlightSelector: '#btn-mission', waitForAction: null, position: 'center' }
                ],
                onComplete: function() { startSimulation(); }
            });
            if (tutorial.isCompleted()) {
                startSimulation();
            } else {
                tutorial.start();
            }
        } else {
            startSimulation();
        }

        window.addEventListener('resize', onResize);
        document.addEventListener('keydown', function (e) {
            if (e.key === 'Escape' && !isStarted) startSimulation();
            if (e.key === 'm' || e.key === 'M') {
                if (isStarted) showMissionSelect();
            }
            if (e.key === 'v' || e.key === 'V') {
                if (windPanel) windPanel.toggle();
            }
            if (e.key === 'b' || e.key === 'B') {
                if (tuningPanel) tuningPanel.toggle();
            }
            if ((e.key === 'p' || e.key === 'P') && !e.ctrlKey && !e.altKey && !e.metaKey) {
                if (pathOverlay) pathOverlay.toggle();
            }
        });
    }

    function initMissions() {
        if (!MissionManager || !createHighMissions || !MissionSelectUI) return;

        missionManager = new MissionManager('drone-high-progress');
        var missions = createHighMissions();
        missions.forEach(function (m) { missionManager.addMission(m); });

        missionManager.onMissionStart = function (mission) {
            currentMissionDef = mission;
            var origMission = missions[mission.index];
            if (origMission.setup) origMission.setup(scene);
            currentMissionDef._origMission = origMission;

            physics.reset();
            if (messageDisplay) messageDisplay.show(mission.name + ' 시작!', 'info', 2000);
            missionUI.showMissionHUD(mission);

            // 경로 정보 추출 및 설정
            setupPathForMission(origMission);
        };

        missionManager.onMissionComplete = function (result) {
            if (audioManager) audioManager.playMissionComplete();
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
            clearPathInfo();
            missionUI.hideMissionHUD();
            missionUI.showResult(result,
                function () { startMission(result.mission.index); },
                function () { startMission(result.mission.index + 1); },
                function () { showMissionSelect(); }
            );
        };

        missionManager.onMissionFail = function (result) {
            if (audioManager) audioManager.playMissionFail();
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
            clearPathInfo();
            missionUI.hideMissionHUD();
            missionUI.showResult(result,
                function () { startMission(result.mission.index); },
                null,
                function () { showMissionSelect(); }
            );
        };

        missionManager.onObjectiveUpdate = function (obj) {
            if (audioManager) audioManager.playWaypointReached();
            if (messageDisplay) messageDisplay.show(obj.description + ' 완료!', 'success', 1500);
        };

        missionManager.onAllMissionsComplete = function () {
            var modal = document.createElement('div');
            modal.style.cssText = 'position:fixed;inset:0;z-index:2000;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.75);';
            modal.innerHTML = '<div style="background:#1a1a2e;border:2px solid rgba(74,158,255,0.5);border-radius:16px;padding:40px 48px;text-align:center;max-width:420px;color:#fff;font-family:inherit;">' +
                '<div style="font-size:48px;margin-bottom:16px;">&#x1F389;</div>' +
                '<h2 style="font-size:22px;margin-bottom:12px;color:#4a9eff;">축하합니다!</h2>' +
                '<p style="font-size:15px;margin-bottom:8px;line-height:1.6;">모든 비행 미션을 완료했어요!</p>' +
                '<p style="font-size:14px;color:#aaa;margin-bottom:28px;">이제 블록 코딩에 도전해볼까요?</p>' +
                '<div style="display:flex;gap:12px;justify-content:center;">' +
                '<button id="modal-next-stage" style="padding:12px 24px;border-radius:8px;border:none;background:#4a9eff;color:#fff;font-size:15px;font-weight:bold;cursor:pointer;font-family:inherit;">&#x1F9E9; 블록 코딩 시작하기</button>' +
                '<button id="modal-practice" style="padding:12px 24px;border-radius:8px;border:1px solid rgba(255,255,255,0.2);background:rgba(255,255,255,0.05);color:#ccc;font-size:15px;cursor:pointer;font-family:inherit;">더 연습하기</button>' +
                '</div></div>';
            document.body.appendChild(modal);
            document.getElementById('modal-next-stage').addEventListener('click', function () {
                window.location.href = 'blockly.html';
            });
            document.getElementById('modal-practice').addEventListener('click', function () {
                modal.remove();
            });
        };

        missionUI = new MissionSelectUI(missionManager,
            function (idx) { startMission(idx); },
            function () { /* 자유비행 복귀 */ }
        );

        // 미션 버튼 + M키 안내
        var missionBtn = document.createElement('button');
        missionBtn.id = 'btn-mission';
        missionBtn.textContent = '미션 (M)';
        missionBtn.style.cssText = 'position:fixed;top:50px;left:50%;transform:translateX(-50%);z-index:50;padding:8px 24px;border-radius:20px;border:1px solid rgba(74,158,255,0.4);background:rgba(74,158,255,0.15);color:#4a9eff;font-size:14px;font-weight:bold;cursor:pointer;font-family:inherit;';
        missionBtn.addEventListener('click', function () { showMissionSelect(); });
        document.body.appendChild(missionBtn);

        // 음소거 버튼
        if (audioManager) {
            var muteBtn = document.createElement('button');
            muteBtn.id = 'btn-mute';
            muteBtn.textContent = '🔊';
            muteBtn.style.cssText = 'position:fixed;top:10px;right:10px;z-index:50;padding:8px 16px;border-radius:50%;border:1px solid rgba(255,255,255,0.3);background:rgba(0,0,0,0.5);color:#fff;font-size:18px;cursor:pointer;width:44px;height:44px;display:flex;align-items:center;justify-content:center;';
            muteBtn.addEventListener('click', function () {
                audioManager.toggleMute();
                muteBtn.textContent = audioManager.isMuted ? '🔇' : '🔊';
            });
            document.body.appendChild(muteBtn);
        }

        // wp-guide는 이제 mission-hud 안에 통합됨 (별도 div 불필요)
    }

    function showMissionSelect() {
        if (!missionManager || !missionUI) return;
        if (missionManager.isRunning) {
            missionManager.stopMission();
            missionUI.hideMissionHUD();
            if (currentMissionDef && currentMissionDef._origMission && currentMissionDef._origMission.cleanup) {
                currentMissionDef._origMission.cleanup(scene);
            }
        }
        clearPathInfo();
        physics.reset();
        missionUI.show();
    }

    /**
     * 미션에서 웨이포인트를 추출하고 경로 정보를 설정
     */
    function setupPathForMission(origMission) {
        // 미션의 setup 함수 내 targets 배열을 추출하기 위해
        // collectibles에서 좌표 추출 (짝수 인덱스가 타겟 구체)
        var waypoints = [];
        if (origMission.collectibles && origMission.collectibles.length > 0) {
            for (var i = 0; i < origMission.collectibles.length; i += 2) {
                var obj = origMission.collectibles[i];
                if (obj && obj.position) {
                    waypoints.push({
                        x: obj.position.x,
                        y: obj.position.y,
                        z: obj.position.z
                    });
                }
            }
        }

        // 웨이포인트가 있는 미션에서만 경로 정보 표시
        if (waypoints.length > 1) {
            // 물리 기반 시간 추정
            var estimate = { totalTime: 0, segmentTimes: [] };
            if (autopilot) {
                estimate = autopilot.estimatePathTime(waypoints);
            }

            // 미니맵에 경로 표시
            if (minimap) {
                minimap.setWaypoints(waypoints);
                minimap.setCurrentWaypointIndex(0);
            }

            // PathOverlay에 경로 정보 설정
            if (pathOverlay) {
                pathOverlay.setPath(waypoints, estimate.segmentTimes, estimate.totalTime);
                pathOverlay.show();
            }

            // 미션에 경로 정보 저장 (프레임 업데이트용)
            currentMissionDef._pathWaypoints = waypoints;
            currentMissionDef._pathEstimate = estimate;
        }
    }

    /**
     * 경로 정보 초기화
     */
    function clearPathInfo() {
        if (minimap) minimap.clearWaypoints();
        if (pathOverlay) {
            pathOverlay.clear();
            pathOverlay.hide();
        }
    }

    function startMission(index) {
        if (!missionManager) return;
        if (index >= missionManager.missions.length) {
            if (messageDisplay) messageDisplay.show('모든 미션을 완료했습니다!', 'success', 3000);
            return;
        }
        if (!missionManager.isMissionUnlocked(index)) {
            if (messageDisplay) messageDisplay.show('이전 미션을 먼저 완료하세요!', 'warning', 2000);
            return;
        }
        physics.reset();
        physics.takeoff(3);
        missionManager.startMission(index);
    }

    function onResize() {
        if (!camera || !renderer) return;
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    }

    function animate() {
        requestAnimationFrame(animate);

        // inline onclick 백업에서 시작된 경우도 감지
        if (window._droneStarted && !isStarted) {
            isStarted = true;
        }

        if (!clock || !renderer) return;
        var dt = Math.min(clock.getDelta(), 0.05);

        if (isStarted && controls && physics) {
            var input = controls.getInput();

            var state = physics.update(dt, input);
            if (droneModel) {
                droneModel.updateFromPhysics(state);
                droneModel.updatePropellers(dt, input.throttle);
            }
            if (cameraSystem) cameraSystem.update(dt);
            if (hud) hud.update(state);
            if (minimap) minimap.update(state);
            if (audioManager) audioManager.update(state);

            // 미션 업데이트
            if (missionManager && missionManager.isRunning && currentMissionDef) {
                if (currentMissionDef._origMission && currentMissionDef._origMission.frameUpdate) {
                    currentMissionDef._origMission.frameUpdate(state, missionManager.missionTime, dt);
                    // frameUpdate 후 미션 상태 동기화 (origMission → currentMission)
                    // startMission의 shallow copy로 인해 원본 상태가 복사본에 반영 안 되는 문제 해결
                    var origM_ = currentMissionDef._origMission;
                    for (var k in origM_) {
                        if ((k.charAt(0) === '_' || k === 'collectibles') && origM_.hasOwnProperty(k)) {
                            currentMissionDef[k] = origM_[k];
                        }
                    }
                }
                missionManager.update(dt, state);
                if (missionUI) missionUI.updateMissionHUD(currentMissionDef, missionManager.missionTime);

                // 웨이포인트 방향 안내 (mission-hud 내부에 통합)
                var origM = currentMissionDef._origMission;
                var wpGuideEl = document.getElementById('wp-guide-line');
                var wpIdx = 0;
                if (origM) {
                    if (origM._currentTarget !== undefined) wpIdx = origM._currentTarget;
                    else if (origM._currentCheckpoint !== undefined) wpIdx = origM._currentCheckpoint;
                    else if (origM._nearestUnpassed !== undefined) wpIdx = origM._nearestUnpassed;
                }
                var wpTargets = origM ? (origM._targets || null) : null;

                // _targets 배열이 없으면 collectibles에서 추출
                if (!wpTargets && origM && origM.collectibles && origM.collectibles.length > 0) {
                    var wpsFromCollectibles = [];
                    for (var ci = 0; ci < origM.collectibles.length; ci += 2) {
                        var obj = origM.collectibles[ci];
                        if (obj && obj.position) {
                            wpsFromCollectibles.push({
                                x: obj.position.x,
                                y: obj.position.y,
                                z: obj.position.z
                            });
                        }
                    }
                    if (wpsFromCollectibles.length > 0) wpTargets = wpsFromCollectibles;
                }

                if (wpGuideEl && wpTargets && wpIdx < wpTargets.length) {
                    var wp = wpTargets[wpIdx];
                    var dx = wp.x - state.position.x;
                    var dy = wp.y - state.position.y;
                    var dz = wp.z - state.position.z;
                    var distToWp = Math.sqrt(dx * dx + dy * dy + dz * dz);

                    // 방향 화살표 (드론 기준 상대 방향)
                    var angle = Math.atan2(dx, -dz) * 180 / Math.PI;
                    var headingDiff = angle - (state.heading || 0);
                    var arrow = '&#x2191;';
                    var absDiff = ((headingDiff % 360) + 360) % 360;
                    if (absDiff > 330 || absDiff < 30) arrow = '&#x2191;';
                    else if (absDiff >= 30 && absDiff < 60) arrow = '&#x2197;';
                    else if (absDiff >= 60 && absDiff < 120) arrow = '&#x2192;';
                    else if (absDiff >= 120 && absDiff < 150) arrow = '&#x2198;';
                    else if (absDiff >= 150 && absDiff < 210) arrow = '&#x2193;';
                    else if (absDiff >= 210 && absDiff < 240) arrow = '&#x2199;';
                    else if (absDiff >= 240 && absDiff < 300) arrow = '&#x2190;';
                    else arrow = '&#x2196;';

                    var heightHint = '';
                    if (dy > 1.5) heightHint = ' <span style="color:#66ccff;">&#x25B2; ' + dy.toFixed(1) + 'm 위</span>';
                    else if (dy < -1.5) heightHint = ' <span style="color:#ff8866;">&#x25BC; ' + (-dy).toFixed(1) + 'm 아래</span>';

                    wpGuideEl.innerHTML = '<span style="font-size:18px;">' + arrow + '</span> ' +
                        '<b>#' + (wpIdx + 1) + '</b> (' + wp.x + ', ' + wp.y + ', ' + wp.z + ') ' +
                        '<span style="color:#ffcc44;">' + distToWp.toFixed(1) + 'm</span>' + heightHint;
                    wpGuideEl.style.display = 'block';
                } else if (wpGuideEl) {
                    if (wpTargets && wpIdx >= wpTargets.length) {
                        wpGuideEl.innerHTML = '<span style="color:#44ff88;">모든 웨이포인트 완료!</span>';
                        wpGuideEl.style.display = 'block';
                    } else {
                        wpGuideEl.style.display = 'none';
                    }
                }

                // 경로 진행 상황 업데이트
                if (currentMissionDef._pathWaypoints && origM) {
                    var wps = currentMissionDef._pathWaypoints;

                    if (minimap) minimap.setCurrentWaypointIndex(wpIdx);

                    var distToNext = 0;
                    if (wpIdx < wps.length) {
                        var pdx = wps[wpIdx].x - state.position.x;
                        var pdy = wps[wpIdx].y - state.position.y;
                        var pdz = wps[wpIdx].z - state.position.z;
                        distToNext = Math.sqrt(pdx * pdx + pdy * pdy + pdz * pdz);
                    }

                    var remTime = 0;
                    if (currentMissionDef._pathEstimate && currentMissionDef._pathEstimate.segmentTimes) {
                        var segTimes = currentMissionDef._pathEstimate.segmentTimes;
                        for (var si = wpIdx; si < segTimes.length; si++) {
                            remTime += segTimes[si];
                        }
                    }

                    if (pathOverlay) {
                        pathOverlay.updateProgress(wpIdx, distToNext, remTime, state.position);
                    }
                }
            } else {
                // 미션 비활성 시 — wp-guide-line은 mission-hud 안에 있으므로
                // mission-hud가 제거되면 자동으로 사라짐
            }

            var dist = Math.sqrt(state.position.x ** 2 + state.position.z ** 2);
            if (dist > 45 && hud) hud.showWarning('비행 경계를 벗어났습니다!');
            if (state.altitude > 45 && hud) hud.showWarning('최대 고도에 가까워지고 있습니다!');
            if (state.battery < 20 && state.battery > 19.5) {
                if (messageDisplay) messageDisplay.show('배터리 부족! 착륙하세요!', 'warning', 2000);
            }
        }

        renderer.render(scene, camera);
    }

    try {
        init();
        animate();
    } catch (e) {
        var d = document.createElement('div');
        d.style.cssText = 'position:fixed;top:0;left:0;right:0;background:red;color:white;padding:20px;z-index:99999;font-size:16px;font-family:monospace;white-space:pre-wrap;';
        d.textContent = 'INIT ERROR: ' + e.message + '\n' + e.stack;
        document.body.appendChild(d);
    }
})();
