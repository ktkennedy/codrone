/**
 * 드론 시뮬레이터 오디오 매니저
 * Web Audio API 기반 실시간 사운드 이펙트
 */
class AudioManager {
    constructor() {
        this.audioContext = null;
        this.masterGain = null;
        this.rotorGain = null;
        this.effectsGain = null;

        // 로터 사운드 오실레이터
        this.rotorOsc1 = null;
        this.rotorOsc2 = null;
        this.rotorGainNode = null;

        // 바람 사운드
        this.windBuffer = null;
        this.windSource = null;
        this.windGainNode = null;
        this.windFilter = null;

        // 상태
        this.isMuted = false;
        this.isInitialized = false;
        this.userInteracted = false;

        // 볼륨 설정
        this.volumes = {
            master: 0.6,
            rotor: 0.4,
            effects: 0.7
        };

        this._initAudio();
        this._setupUserInteractionDetection();
    }

    _initAudio() {
        try {
            // AudioContext 생성 (브라우저 호환성 처리)
            const AudioContext = window.AudioContext || window.webkitAudioContext;
            if (!AudioContext) {
                console.warn('Web Audio API not supported');
                return;
            }

            this.audioContext = new AudioContext();

            // 마스터 게인 체인: masterGain -> rotorGain/effectsGain
            this.masterGain = this.audioContext.createGain();
            this.masterGain.gain.value = this.volumes.master;
            this.masterGain.connect(this.audioContext.destination);

            this.rotorGain = this.audioContext.createGain();
            this.rotorGain.gain.value = this.volumes.rotor;
            this.rotorGain.connect(this.masterGain);

            this.effectsGain = this.audioContext.createGain();
            this.effectsGain.gain.value = this.volumes.effects;
            this.effectsGain.connect(this.masterGain);

            this.isInitialized = true;
        } catch (e) {
            console.warn('Audio initialization failed:', e);
        }
    }

    _setupUserInteractionDetection() {
        // 브라우저 자동재생 정책: 첫 사용자 상호작용 시 AudioContext 재개
        const resumeAudio = () => {
            if (this.audioContext && this.audioContext.state === 'suspended') {
                this.audioContext.resume();
            }
            this.userInteracted = true;
        };

        ['click', 'touchstart', 'keydown'].forEach(event => {
            document.addEventListener(event, resumeAudio, { once: true });
        });
    }

    /**
     * 로터 사운드 시작 (연속 재생)
     */
    _startRotorSound() {
        if (!this.isInitialized || this.rotorOsc1) return;

        try {
            // 2개의 디튠된 오실레이터로 풍부한 사운드 생성
            this.rotorOsc1 = this.audioContext.createOscillator();
            this.rotorOsc2 = this.audioContext.createOscillator();

            this.rotorGainNode = this.audioContext.createGain();
            this.rotorGainNode.gain.value = 0;

            this.rotorOsc1.type = 'sawtooth';
            this.rotorOsc2.type = 'sawtooth';
            this.rotorOsc1.frequency.value = 100;
            this.rotorOsc2.frequency.value = 100;
            this.rotorOsc2.detune.value = 5; // 약간 디튠

            this.rotorOsc1.connect(this.rotorGainNode);
            this.rotorOsc2.connect(this.rotorGainNode);
            this.rotorGainNode.connect(this.rotorGain);

            this.rotorOsc1.start();
            this.rotorOsc2.start();
        } catch (e) {
            console.warn('Rotor sound start failed:', e);
        }
    }

    /**
     * 로터 사운드 중지
     */
    _stopRotorSound() {
        if (!this.rotorOsc1) return;

        try {
            // 페이드 아웃
            const now = this.audioContext.currentTime;
            this.rotorGainNode.gain.setValueAtTime(this.rotorGainNode.gain.value, now);
            this.rotorGainNode.gain.linearRampToValueAtTime(0, now + 0.3);

            setTimeout(() => {
                if (this.rotorOsc1) {
                    this.rotorOsc1.stop();
                    this.rotorOsc2.stop();
                    this.rotorOsc1 = null;
                    this.rotorOsc2 = null;
                    this.rotorGainNode = null;
                }
            }, 350);
        } catch (e) {
            console.warn('Rotor sound stop failed:', e);
        }
    }

    /**
     * 바람 사운드 시작
     */
    _startWindSound() {
        if (!this.isInitialized || this.windSource) return;

        try {
            // 화이트 노이즈 생성
            if (!this.windBuffer) {
                const bufferSize = this.audioContext.sampleRate * 2;
                this.windBuffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
                const data = this.windBuffer.getChannelData(0);
                for (let i = 0; i < bufferSize; i++) {
                    data[i] = Math.random() * 2 - 1;
                }
            }

            this.windSource = this.audioContext.createBufferSource();
            this.windSource.buffer = this.windBuffer;
            this.windSource.loop = true;

            // 밴드패스 필터로 자연스러운 바람 소리
            this.windFilter = this.audioContext.createBiquadFilter();
            this.windFilter.type = 'bandpass';
            this.windFilter.frequency.value = 800;
            this.windFilter.Q.value = 0.5;

            this.windGainNode = this.audioContext.createGain();
            this.windGainNode.gain.value = 0;

            this.windSource.connect(this.windFilter);
            this.windFilter.connect(this.windGainNode);
            this.windGainNode.connect(this.rotorGain);

            this.windSource.start();
        } catch (e) {
            console.warn('Wind sound start failed:', e);
        }
    }

    /**
     * 드론 상태 업데이트 (매 프레임 호출)
     * @param {Object} droneState - 드론 물리 상태 (position, velocity, isFlying 등)
     */
    update(droneState) {
        if (!this.isInitialized || this.isMuted) return;

        try {
            // 로터 사운드
            if (droneState.isFlying) {
                if (!this.rotorOsc1) this._startRotorSound();
                if (!this.windSource) this._startWindSound();

                // 로터 속도를 주파수로 매핑 (평균 RPM)
                const physics = droneState._physics || window._dronePhysics;
                let avgRotorSpeed = 0;
                if (physics && physics._rotorSpeeds) {
                    avgRotorSpeed = (physics._rotorSpeeds[0] + physics._rotorSpeeds[1] +
                                   physics._rotorSpeeds[2] + physics._rotorSpeeds[3]) / 4;
                }

                // RPM을 주파수로 변환 (rad/s → Hz 근사)
                // 호버: ~950 rad/s → 150 Hz, 최대: ~1500 rad/s → 240 Hz
                const baseFreq = 50 + (avgRotorSpeed / 1500) * 200;
                const freq = Math.max(50, Math.min(250, baseFreq));

                if (this.rotorOsc1) {
                    const now = this.audioContext.currentTime;
                    this.rotorOsc1.frequency.setTargetAtTime(freq, now, 0.05);
                    this.rotorOsc2.frequency.setTargetAtTime(freq, now, 0.05);

                    // 볼륨은 로터 속도에 비례
                    const volume = Math.max(0.1, Math.min(0.8, avgRotorSpeed / 1500));
                    this.rotorGainNode.gain.setTargetAtTime(volume, now, 0.1);
                }

                // 바람 사운드 (속도에 비례)
                if (this.windGainNode && droneState.speed !== undefined) {
                    const windVol = Math.min(0.15, droneState.speed * 0.01);
                    const now = this.audioContext.currentTime;
                    this.windGainNode.gain.setTargetAtTime(windVol, now, 0.2);
                }
            } else {
                // 비행 중이 아니면 로터 사운드 중지
                if (this.rotorOsc1) this._stopRotorSound();
                if (this.windSource) {
                    const now = this.audioContext.currentTime;
                    this.windGainNode.gain.setTargetAtTime(0, now, 0.2);
                }
            }
        } catch (e) {
            console.warn('Audio update failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 이륙
     */
    playTakeoff() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = 200;

            const now = this.audioContext.currentTime;
            osc.frequency.setValueAtTime(200, now);
            osc.frequency.exponentialRampToValueAtTime(800, now + 0.5);

            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.effectsGain);

            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {
            console.warn('Takeoff sound failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 착륙
     */
    playLand() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            const now = this.audioContext.currentTime;
            osc.frequency.setValueAtTime(800, now);
            osc.frequency.exponentialRampToValueAtTime(200, now + 0.5);

            gain.gain.setValueAtTime(0.25, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.5);

            osc.connect(gain);
            gain.connect(this.effectsGain);

            osc.start(now);
            osc.stop(now + 0.5);
        } catch (e) {
            console.warn('Land sound failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 미션 완료
     */
    playMissionComplete() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            // C-E-G 아르페지오 (행복한 코드)
            const notes = [261.63, 329.63, 392.00]; // C4, E4, G4
            const now = this.audioContext.currentTime;

            notes.forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'triangle';
                osc.frequency.value = freq;

                const startTime = now + i * 0.15;
                gain.gain.setValueAtTime(0.25, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.3);

                osc.connect(gain);
                gain.connect(this.effectsGain);

                osc.start(startTime);
                osc.stop(startTime + 0.3);
            });
        } catch (e) {
            console.warn('Mission complete sound failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 미션 실패
     */
    playMissionFail() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            // E-C 하강 (슬픈 소리)
            const notes = [329.63, 261.63]; // E4, C4
            const now = this.audioContext.currentTime;

            notes.forEach((freq, i) => {
                const osc = this.audioContext.createOscillator();
                const gain = this.audioContext.createGain();

                osc.type = 'triangle';
                osc.frequency.value = freq;

                const startTime = now + i * 0.25;
                gain.gain.setValueAtTime(0.2, startTime);
                gain.gain.exponentialRampToValueAtTime(0.01, startTime + 0.5);

                osc.connect(gain);
                gain.connect(this.effectsGain);

                osc.start(startTime);
                osc.stop(startTime + 0.5);
            });
        } catch (e) {
            console.warn('Mission fail sound failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 웨이포인트 도달
     */
    playWaypointReached() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            const osc = this.audioContext.createOscillator();
            const gain = this.audioContext.createGain();

            osc.type = 'sine';
            osc.frequency.value = 1000;

            const now = this.audioContext.currentTime;
            gain.gain.setValueAtTime(0.3, now);
            gain.gain.exponentialRampToValueAtTime(0.01, now + 0.1);

            osc.connect(gain);
            gain.connect(this.effectsGain);

            osc.start(now);
            osc.stop(now + 0.1);
        } catch (e) {
            console.warn('Waypoint sound failed:', e);
        }
    }

    /**
     * 이벤트 사운드: 충돌
     */
    playCollision() {
        if (!this.isInitialized || this.isMuted) return;

        try {
            // 짧은 노이즈 버스트
            const bufferSize = this.audioContext.sampleRate * 0.2;
            const buffer = this.audioContext.createBuffer(1, bufferSize, this.audioContext.sampleRate);
            const data = buffer.getChannelData(0);
            for (let i = 0; i < bufferSize; i++) {
                data[i] = (Math.random() * 2 - 1) * Math.exp(-i / bufferSize * 10);
            }

            const source = this.audioContext.createBufferSource();
            source.buffer = buffer;

            const gain = this.audioContext.createGain();
            gain.gain.value = 0.4;

            source.connect(gain);
            gain.connect(this.effectsGain);

            source.start();
        } catch (e) {
            console.warn('Collision sound failed:', e);
        }
    }

    /**
     * 마스터 볼륨 설정
     * @param {number} volume - 0~1
     */
    setMasterVolume(volume) {
        if (!this.isInitialized) return;
        this.volumes.master = Math.max(0, Math.min(1, volume));
        this.masterGain.gain.setTargetAtTime(this.volumes.master, this.audioContext.currentTime, 0.05);
    }

    /**
     * 로터 사운드 볼륨 설정
     * @param {number} volume - 0~1
     */
    setRotorVolume(volume) {
        if (!this.isInitialized) return;
        this.volumes.rotor = Math.max(0, Math.min(1, volume));
        this.rotorGain.gain.setTargetAtTime(this.volumes.rotor, this.audioContext.currentTime, 0.05);
    }

    /**
     * 효과음 볼륨 설정
     * @param {number} volume - 0~1
     */
    setEffectsVolume(volume) {
        if (!this.isInitialized) return;
        this.volumes.effects = Math.max(0, Math.min(1, volume));
        this.effectsGain.gain.setTargetAtTime(this.volumes.effects, this.audioContext.currentTime, 0.05);
    }

    /**
     * 음소거
     */
    mute() {
        this.isMuted = true;
        if (this.isInitialized) {
            this.masterGain.gain.setTargetAtTime(0, this.audioContext.currentTime, 0.05);
        }
    }

    /**
     * 음소거 해제
     */
    unmute() {
        this.isMuted = false;
        if (this.isInitialized) {
            this.masterGain.gain.setTargetAtTime(this.volumes.master, this.audioContext.currentTime, 0.05);
        }
    }

    /**
     * 음소거 토글
     */
    toggleMute() {
        if (this.isMuted) {
            this.unmute();
        } else {
            this.mute();
        }
        return this.isMuted;
    }
}

// 전역 네임스페이스에 등록
window.DroneSim = window.DroneSim || {};
window.DroneSim.AudioManager = AudioManager;
