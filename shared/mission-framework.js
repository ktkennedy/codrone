/**
 * 미션 프레임워크
 * 미션 정의, 진행, 성공/실패 판정, 별점 평가, 저장 시스템
 */

// ===== 미션 매니저 =====
class MissionManager {
    constructor(storageKey) {
        this.storageKey = storageKey || 'drone-sim-progress';
        this.missions = [];
        this.currentMission = null;
        this.isRunning = false;
        this.missionTime = 0;
        this.progress = this._loadProgress();

        // 콜백
        this.onMissionStart = null;
        this.onMissionComplete = null;
        this.onMissionFail = null;
        this.onObjectiveUpdate = null;
        this.onAllMissionsComplete = null;
    }

    /**
     * 미션 등록
     */
    addMission(mission) {
        mission.index = this.missions.length;
        this.missions.push(mission);
    }

    /**
     * 미션 시작
     */
    startMission(index) {
        if (index >= this.missions.length) return false;

        const mission = this.missions[index];
        this.currentMission = {
            ...mission,
            objectives: mission.objectives.map(obj => ({
                ...obj,
                completed: false
            })),
            startTime: Date.now(),
            completed: false,
            failed: false
        };
        this.isRunning = true;
        this.missionTime = 0;

        if (this.onMissionStart) this.onMissionStart(this.currentMission);
        return true;
    }

    /**
     * 미션 업데이트 (매 프레임 호출)
     */
    update(dt, droneState) {
        if (!this.isRunning || !this.currentMission) return;

        this.missionTime += dt;

        const mission = this.currentMission;

        // 시간 제한 체크
        if (mission.timeLimit && this.missionTime > mission.timeLimit) {
            this._failMission('시간 초과!');
            return;
        }

        // 각 목표 체크
        mission.objectives.forEach((obj, i) => {
            if (obj.completed) return;

            if (obj.check(droneState, this.missionTime, mission)) {
                obj.completed = true;
                if (this.onObjectiveUpdate) {
                    this.onObjectiveUpdate(obj, i, mission);
                }
            }
        });

        // 실패 조건 체크
        if (mission.failCondition && mission.failCondition(droneState, this.missionTime)) {
            this._failMission(mission.failMessage || '미션 실패!');
            return;
        }

        // 모든 목표 달성 체크
        if (mission.objectives.every(obj => obj.completed)) {
            this._completeMission();
        }
    }

    _completeMission() {
        this.isRunning = false;
        this.currentMission.completed = true;

        const stars = this._calculateStars();
        const result = {
            mission: this.currentMission,
            time: this.missionTime,
            stars: stars
        };

        // 진행 저장
        this._saveResult(this.currentMission.index, stars);

        if (this.onMissionComplete) this.onMissionComplete(result);
    }

    _failMission(reason) {
        this.isRunning = false;
        this.currentMission.failed = true;

        if (this.onMissionFail) {
            this.onMissionFail({
                mission: this.currentMission,
                reason: reason,
                time: this.missionTime
            });
        }
    }

    _calculateStars() {
        const mission = this.currentMission;
        let stars = 1; // 기본 1점 (완료)

        if (mission.starCriteria) {
            if (mission.starCriteria.twoStar && mission.starCriteria.twoStar(this.missionTime)) {
                stars = 2;
            }
            if (mission.starCriteria.threeStar && mission.starCriteria.threeStar(this.missionTime)) {
                stars = 3;
            }
        } else {
            // 기본 시간 기반 별점
            if (mission.timeLimit) {
                if (this.missionTime < mission.timeLimit * 0.5) stars = 3;
                else if (this.missionTime < mission.timeLimit * 0.75) stars = 2;
            }
        }

        return stars;
    }

    /**
     * 미션 중단
     */
    stopMission() {
        this.isRunning = false;
        this.currentMission = null;
    }

    /**
     * 미션 잠금 해제 여부
     */
    isMissionUnlocked(index) {
        if (index === 0) return true;
        return this.progress[index - 1] && this.progress[index - 1].stars > 0;
    }

    /**
     * 미션 별점 기록
     */
    getMissionStars(index) {
        return this.progress[index] ? this.progress[index].stars : 0;
    }

    // 저장/불러오기
    _saveResult(index, stars) {
        if (!this.progress[index] || stars > this.progress[index].stars) {
            this.progress[index] = { stars: stars, time: this.missionTime };
        }
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.progress));
        } catch (e) { /* localStorage 사용 불가 시 무시 */ }
    }

    _loadProgress() {
        try {
            const data = localStorage.getItem(this.storageKey);
            return data ? JSON.parse(data) : {};
        } catch (e) {
            return {};
        }
    }

    resetProgress() {
        this.progress = {};
        try {
            localStorage.removeItem(this.storageKey);
        } catch (e) { /* 무시 */ }
    }
}

// ===== 미션 선택 UI =====
class MissionSelectUI {
    constructor(missionManager, onSelect, onClose) {
        this.manager = missionManager;
        this.onSelect = onSelect;
        this.onClose = onClose;
        this.element = null;
        this._createStyles();
    }

    _createStyles() {
        if (document.getElementById('mission-ui-styles')) return;
        const style = document.createElement('style');
        style.id = 'mission-ui-styles';
        style.textContent = `
            #mission-select-overlay {
                position: fixed;
                top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.85);
                z-index: 500;
                display: flex;
                align-items: center;
                justify-content: center;
                font-family: 'Noto Sans KR', sans-serif;
            }
            .mission-panel {
                background: rgba(20, 35, 55, 0.97);
                border: 2px solid rgba(255,255,255,0.1);
                border-radius: 20px;
                padding: 30px;
                max-width: 600px;
                width: 90%;
                max-height: 80vh;
                overflow-y: auto;
            }
            .mission-panel h2 {
                text-align: center;
                color: #fff;
                font-size: 24px;
                margin-bottom: 20px;
            }
            .mission-list {
                display: flex;
                flex-direction: column;
                gap: 10px;
            }
            .mission-item {
                display: flex;
                align-items: center;
                gap: 15px;
                padding: 15px;
                border-radius: 12px;
                background: rgba(255,255,255,0.05);
                border: 1px solid rgba(255,255,255,0.1);
                cursor: pointer;
                transition: all 0.2s;
                color: #fff;
            }
            .mission-item:hover:not(.locked) {
                background: rgba(255,255,255,0.1);
                border-color: rgba(255,255,255,0.3);
            }
            .mission-item.locked {
                opacity: 0.4;
                cursor: not-allowed;
            }
            .mission-num {
                width: 36px; height: 36px;
                border-radius: 50%;
                background: rgba(74, 158, 255, 0.3);
                display: flex;
                align-items: center;
                justify-content: center;
                font-weight: bold;
                font-size: 16px;
                flex-shrink: 0;
            }
            .mission-item.locked .mission-num {
                background: rgba(255,255,255,0.1);
            }
            .mission-info {
                flex: 1;
            }
            .mission-info .name {
                font-size: 16px;
                font-weight: bold;
                margin-bottom: 3px;
            }
            .mission-info .desc {
                font-size: 14px;
                color: #88aacc;
            }
            .mission-stars {
                display: flex;
                gap: 2px;
                flex-shrink: 0;
            }
            .star {
                font-size: 18px;
                color: #333;
            }
            .star.earned { color: #ffd700; }
            .mission-close-btn {
                display: block;
                margin: 20px auto 0;
                padding: 10px 30px;
                background: rgba(255,255,255,0.1);
                border: 1px solid rgba(255,255,255,0.2);
                border-radius: 8px;
                color: #aaa;
                font-size: 14px;
                cursor: pointer;
            }
            .mission-close-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            /* 미션 결과 */
            .mission-result {
                position: fixed;
                top: 50%; left: 50%;
                transform: translate(-50%, -50%);
                background: rgba(20, 35, 55, 0.97);
                border: 2px solid rgba(255,255,255,0.15);
                border-radius: 20px;
                padding: 40px;
                text-align: center;
                z-index: 600;
                min-width: 300px;
                color: #fff;
                font-family: 'Noto Sans KR', sans-serif;
            }
            .mission-result h3 {
                font-size: 28px;
                margin-bottom: 10px;
            }
            .mission-result .result-stars {
                font-size: 40px;
                margin: 15px 0;
            }
            .mission-result .result-time {
                color: #88aacc;
                font-size: 16px;
                margin-bottom: 20px;
            }
            .mission-result .result-btns {
                display: flex;
                gap: 10px;
                justify-content: center;
            }
            .mission-result .result-btn {
                padding: 10px 25px;
                border-radius: 8px;
                border: 1px solid rgba(255,255,255,0.2);
                background: rgba(255,255,255,0.1);
                color: #fff;
                font-size: 14px;
                cursor: pointer;
            }
            .mission-result .result-btn:hover {
                background: rgba(255,255,255,0.2);
            }
            .mission-result .result-btn.primary {
                background: rgba(74, 158, 255, 0.3);
                border-color: rgba(74, 158, 255, 0.5);
            }
            /* 미션 HUD */
            #mission-hud {
                position: fixed;
                top: 70px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(0,0,0,0.6);
                border-radius: 10px;
                padding: 10px 20px;
                z-index: 100;
                color: #fff;
                font-family: 'Noto Sans KR', sans-serif;
                text-align: center;
                min-width: 250px;
            }
            #mission-hud .mission-title {
                font-size: 14px;
                font-weight: bold;
                color: #4a9eff;
                margin-bottom: 5px;
            }
            #mission-hud .mission-objective {
                font-size: 13px;
                color: #aabbcc;
            }
            #mission-hud .mission-objective.done {
                color: #44ff88;
                text-decoration: line-through;
            }
            #mission-hud .mission-timer {
                font-size: 11px;
                color: #ffaa44;
                margin-top: 5px;
            }
            #mission-hud .wp-guide-line {
                font-size: 12px;
                margin-top: 6px;
                padding-top: 6px;
                border-top: 1px solid rgba(255,255,255,0.15);
                color: #fff;
            }
            @keyframes confetti-fall { 0% { transform: translateY(-100vh) rotate(0deg); opacity: 1; } 100% { transform: translateY(100vh) rotate(720deg); opacity: 0; } }
            .confetti { position: fixed; width: 10px; height: 10px; z-index: 700; pointer-events: none; animation: confetti-fall 3s ease-in forwards; }
        `;
        document.head.appendChild(style);
    }

    show() {
        this.hide();
        const overlay = document.createElement('div');
        overlay.id = 'mission-select-overlay';

        let missionsHtml = '';
        this.manager.missions.forEach((m, i) => {
            const unlocked = this.manager.isMissionUnlocked(i);
            const stars = this.manager.getMissionStars(i);
            const starsHtml = [1, 2, 3].map(s =>
                `<span class="star ${s <= stars ? 'earned' : ''}">&#x2605;</span>`
            ).join('');

            missionsHtml += `
                <div class="mission-item ${unlocked ? '' : 'locked'}" data-index="${i}" role="button" tabindex="${unlocked ? 0 : -1}">
                    <div class="mission-num">${i + 1}</div>
                    <div class="mission-info">
                        <div class="name">${unlocked ? m.name : '???'}</div>
                        <div class="desc">${unlocked ? m.description : '이전 미션을 완료하세요'}</div>
                    </div>
                    <div class="mission-stars">${starsHtml}</div>
                </div>
            `;
        });

        overlay.innerHTML = `
            <div class="mission-panel">
                <h2>&#x1F3AF; 미션 선택</h2>
                <div class="mission-list">${missionsHtml}</div>
                <button class="mission-close-btn" id="mission-close">자유 비행으로 돌아가기</button>
            </div>
        `;

        document.body.appendChild(overlay);
        this.element = overlay;

        // 이벤트
        overlay.querySelectorAll('.mission-item:not(.locked)').forEach(item => {
            item.addEventListener('click', () => {
                const idx = parseInt(item.dataset.index);
                this.hide();
                if (this.onSelect) this.onSelect(idx);
            });
        });

        overlay.querySelectorAll('.mission-item.locked').forEach(function(item) {
            item.addEventListener('click', function() {
                var idx = parseInt(item.dataset.index);
                var toast = document.createElement('div');
                toast.style.cssText = 'position:fixed;bottom:100px;left:50%;transform:translateX(-50%);background:rgba(255,170,68,0.9);color:#fff;padding:10px 20px;border-radius:8px;z-index:600;font-size:14px;font-family:inherit;transition:opacity 0.3s;';
                toast.textContent = '미션 ' + idx + '을 먼저 완료하세요!';
                document.body.appendChild(toast);
                setTimeout(function() { toast.style.opacity = '0'; }, 1500);
                setTimeout(function() { toast.remove(); }, 1800);
            });
        });

        document.getElementById('mission-close').addEventListener('click', () => {
            this.hide();
            if (this.onClose) this.onClose();
        });
    }

    hide() {
        const existing = document.getElementById('mission-select-overlay');
        if (existing) existing.remove();
        this.element = null;
    }

    /**
     * 미션 진행 HUD 표시
     */
    showMissionHUD(mission) {
        this.hideMissionHUD();
        const hud = document.createElement('div');
        hud.id = 'mission-hud';

        let objectivesHtml = mission.objectives.map((obj, i) =>
            `<div class="mission-objective" id="obj-${i}">${obj.description}</div>`
        ).join('');

        hud.innerHTML = `
            <div class="mission-title">${mission.name}</div>
            ${objectivesHtml}
            ${mission.timeLimit ? `<div class="mission-timer" id="mission-timer">남은 시간: ${mission.timeLimit}초</div>` : ''}
            <div class="wp-guide-line" id="wp-guide-line" style="display:none;"></div>
        `;
        document.body.appendChild(hud);
    }

    updateMissionHUD(mission, missionTime) {
        // 목표 상태 업데이트
        if (mission && mission.objectives) {
            mission.objectives.forEach((obj, i) => {
                const el = document.getElementById('obj-' + i);
                if (el && obj.completed) el.classList.add('done');
            });
        }

        // 타이머
        if (mission && mission.timeLimit) {
            const timer = document.getElementById('mission-timer');
            if (timer) {
                const remaining = Math.max(0, mission.timeLimit - missionTime);
                timer.textContent = '남은 시간: ' + remaining.toFixed(1) + '초';
                timer.style.color = remaining < 10 ? '#ff4444' : '#ffaa44';
            }
        }
    }

    hideMissionHUD() {
        const existing = document.getElementById('mission-hud');
        if (existing) existing.remove();
    }

    /**
     * 미션 결과 표시
     */
    showResult(result, onRetry, onNext, onMenu) {
        const isSuccess = result.mission.completed;
        const starsHtml = isSuccess
            ? [1, 2, 3].map(s => s <= result.stars ? '&#x2B50;' : '&#x2606;').join('')
            : '&#x274C;';

        const isLastMission = isSuccess && result.mission.index >= this.missions.length - 1;

        const div = document.createElement('div');
        div.className = 'mission-result';
        div.innerHTML = `
            <h3>${isSuccess ? '미션 성공!' : '미션 실패'}</h3>
            <div class="result-stars">${starsHtml}</div>
            <div class="result-time">${isSuccess ? '시간: ' + result.time.toFixed(1) + '초' : result.reason || ''}</div>
            <div class="result-btns">
                <button class="result-btn" id="result-retry">다시 도전</button>
                ${isSuccess && !isLastMission ? '<button class="result-btn primary" id="result-next">다음 미션</button>' : ''}
                ${isLastMission ? '<button class="result-btn primary" id="result-next-stage">다음 단계로! &#x1F389;</button>' : ''}
                <button class="result-btn" id="result-menu">미션 목록</button>
            </div>
        `;

        document.body.appendChild(div);

        if (isSuccess) {
            var colors = ['#ff6b6b','#ffd93d','#6bcb77','#4d96ff','#ff6bff'];
            for (var i = 0; i < 25; i++) {
                let c = document.createElement('div');
                c.className = 'confetti';
                c.style.left = Math.random() * 100 + '%';
                c.style.top = '-10px';
                c.style.background = colors[Math.floor(Math.random() * colors.length)];
                c.style.animationDelay = Math.random() * 0.5 + 's';
                c.style.borderRadius = Math.random() > 0.5 ? '50%' : '0';
                document.body.appendChild(c);
                setTimeout(function() { c.remove(); }, 3500);
            }
        }

        if (!isSuccess) {
            var flash = document.createElement('div');
            flash.style.cssText = 'position:fixed;inset:0;background:rgba(255,0,0,0.2);z-index:550;pointer-events:none;transition:opacity 0.5s;';
            document.body.appendChild(flash);
            setTimeout(function() { flash.style.opacity = '0'; }, 100);
            setTimeout(function() { flash.remove(); }, 600);
        }

        document.getElementById('result-retry').addEventListener('click', () => {
            div.remove();
            if (onRetry) onRetry();
        });
        if (isSuccess && !isLastMission) {
            document.getElementById('result-next').addEventListener('click', () => {
                div.remove();
                if (onNext) onNext();
            });
        }
        if (isLastMission) {
            document.getElementById('result-next-stage').addEventListener('click', () => {
                div.remove();
                if (this.onAllMissionsComplete) this.onAllMissionsComplete();
            });
        }
        document.getElementById('result-menu').addEventListener('click', () => {
            div.remove();
            if (onMenu) onMenu();
        });
    }
}

window.DroneSim = window.DroneSim || {};
window.DroneSim.MissionManager = MissionManager;
window.DroneSim.MissionSelectUI = MissionSelectUI;
