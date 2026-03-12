// 학생 인증 모듈
// window.DroneSim.StudentAuth
// sessionStorage 기반 로그인 (탭 닫으면 자동 로그아웃)

window.DroneSim = window.DroneSim || {};
window.DroneSim.StudentAuth = (function () {
    var STORAGE_KEY = 'drone-students';
    var SESSION_KEY = 'drone-current-student';

    var DEFAULT_STUDENTS = [
        '학생01', '학생02', '학생03', '학생04', '학생05',
        '학생06', '학생07', '학생08', '학생09', '학생10',
        '학생11', '학생12', '학생13', '학생14', '학생15',
        '학생16', '학생17', '학생18', '학생19', '학생20'
    ];

    // 변경 알림 리스너 목록
    var changeListeners = [];

    function onDataChange(callback) {
        changeListeners.push(callback);
    }

    function notifyChange() {
        var objs = getStudentObjects();
        changeListeners.forEach(function (cb) {
            try { cb(objs); } catch (e) { console.warn('StudentAuth listener error:', e); }
        });
    }

    // 내부 저장 형식: [{name: '학생01', pin: null, group: 'A'}, ...]
    function getStudentObjects() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            var defaultObjs = DEFAULT_STUDENTS.map(function (n) { return { name: n, pin: null, group: 'A' }; });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultObjs));
            return defaultObjs;
        }
        try {
            var parsed = JSON.parse(stored);
            // 구버전 호환: 문자열 배열이면 객체 배열로 마이그레이션
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                var migrated = parsed.map(function (n) { return { name: n, pin: null, group: 'A' }; });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                return migrated;
            }
            // group 필드 마이그레이션: group 없는 객체에 기본값 추가
            var needsSave = false;
            for (var i = 0; i < parsed.length; i++) {
                if (!parsed[i].hasOwnProperty('group')) {
                    parsed[i].group = 'A';
                    needsSave = true;
                }
            }
            if (needsSave) {
                localStorage.setItem(STORAGE_KEY, JSON.stringify(parsed));
            }
            return parsed;
        } catch (e) {
            return DEFAULT_STUDENTS.map(function (n) { return { name: n, pin: null, group: 'A' }; });
        }
    }

    function saveStudentObjects(objs) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(objs));
    }

    // 하위 호환: 이름 문자열 배열 반환 (다른 페이지에서 사용)
    function getStudents() {
        return getStudentObjects().map(function (obj) { return obj.name; });
    }

    function login(studentName) {
        if (!studentName) return;
        sessionStorage.setItem(SESSION_KEY, studentName);
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getCurrentStudent() {
        var val = sessionStorage.getItem(SESSION_KEY);
        if (!val || val === 'null' || val === 'undefined') return null;
        return val;
    }

    function isLoggedIn() {
        return !!getCurrentStudent();
    }

    // 학생별 localStorage 키 생성
    // 예: getKey('drone-coding-progress') → '학생01_drone-coding-progress'
    function getKey(baseKey) {
        var student = getCurrentStudent();
        if (!student) return baseKey;
        return student + '_' + baseKey;
    }

    function addStudent(name, classId) {
        name = name.trim();
        if (!name) return false;
        var objs = getStudentObjects();
        var names = objs.map(function (o) { return o.name; });
        if (names.indexOf(name) !== -1) return false;
        objs.push({ name: name, pin: null, group: classId || 'A' });
        saveStudentObjects(objs);
        notifyChange();
        return true;
    }

    function removeStudent(name) {
        var objs = getStudentObjects();
        var idx = -1;
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === name) { idx = i; break; }
        }
        if (idx === -1) return false;
        objs.splice(idx, 1);
        saveStudentObjects(objs);
        notifyChange();
        return true;
    }

    // 학생 이름 변경 + localStorage 데이터 마이그레이션
    function renameStudent(oldName, newName) {
        newName = newName.trim();
        if (!newName || oldName === newName) return false;
        var objs = getStudentObjects();
        var names = objs.map(function (o) { return o.name; });
        var idx = names.indexOf(oldName);
        if (idx === -1) return false;
        if (names.indexOf(newName) !== -1) return false;

        objs[idx].name = newName;
        saveStudentObjects(objs);

        // localStorage 키 마이그레이션
        var prefix = oldName + '_';
        var newPrefix = newName + '_';
        var keysToMigrate = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf(prefix) === 0) {
                keysToMigrate.push(k);
            }
        }
        keysToMigrate.forEach(function (k) {
            var val = localStorage.getItem(k);
            var newKey = newPrefix + k.slice(prefix.length);
            localStorage.setItem(newKey, val);
            localStorage.removeItem(k);
        });

        notifyChange();
        return true;
    }

    // ===== PIN 관련 함수 =====

    // 4자리 PIN 설정 (처음 설정 또는 변경)
    function setPin(studentName, pin) {
        var objs = getStudentObjects();
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === studentName) {
                objs[i].pin = String(pin);
                saveStudentObjects(objs);
                notifyChange();
                return true;
            }
        }
        return false;
    }

    // PIN 확인 — 일치하면 true
    function verifyPin(studentName, pin) {
        var objs = getStudentObjects();
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === studentName) {
                return objs[i].pin === String(pin);
            }
        }
        return false;
    }

    // 해당 학생이 PIN을 설정했는지 여부
    function hasPin(studentName) {
        var objs = getStudentObjects();
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === studentName) {
                return !!objs[i].pin;
            }
        }
        return false;
    }

    // PIN 값 반환 (교사 모드용)
    function getStudentPin(studentName) {
        var objs = getStudentObjects();
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === studentName) {
                return objs[i].pin;
            }
        }
        return null;
    }

    // 전체 학생 PIN 목록 반환 (교사 대시보드용)
    function getAllStudentPins() {
        return getStudentObjects().map(function (o) { return { name: o.name, pin: o.pin }; });
    }

    // PIN 초기화 (교사 모드용)
    function resetPin(studentName) {
        var objs = getStudentObjects();
        for (var i = 0; i < objs.length; i++) {
            if (objs[i].name === studentName) {
                objs[i].pin = null;
                saveStudentObjects(objs);
                notifyChange();
                return true;
            }
        }
        return false;
    }

    // 전체 학생 객체 반환 (복사본)
    function getAllStudents() {
        return JSON.parse(JSON.stringify(getStudentObjects()));
    }

    // 외부 소스(Firebase 동기화)에서 학생 목록 일괄 교체
    // notifyChange() 호출하지 않음 (무한 루프 방지)
    function setAllStudents(studentObjects) {
        saveStudentObjects(studentObjects);
    }

    // Config 파일(students-config.js)에서 학생 목록 동기화
    function syncFromConfig() {
        var config = window.DroneSim.StudentsConfig;
        if (!config || !Array.isArray(config)) return;

        var currentObjs = getStudentObjects();
        var currentNames = currentObjs.map(function(o) { return o.name; });

        // Build the target student list from config
        var configStudents = [];
        config.forEach(function(cls) {
            cls.students.forEach(function(name) {
                configStudents.push({ name: name, classId: cls.id });
            });
        });

        // Check if the config student list matches localStorage
        var needsSync = false;

        // If student count differs or names differ, sync
        if (currentObjs.length !== configStudents.length) {
            needsSync = true;
        } else {
            for (var i = 0; i < configStudents.length; i++) {
                if (currentNames.indexOf(configStudents[i].name) === -1) {
                    needsSync = true;
                    break;
                }
            }
        }

        if (!needsSync) {
            // Just ensure classId is up to date
            var changed = false;
            for (var i = 0; i < currentObjs.length; i++) {
                for (var j = 0; j < configStudents.length; j++) {
                    if (currentObjs[i].name === configStudents[j].name && currentObjs[i].group !== configStudents[j].classId) {
                        currentObjs[i].group = configStudents[j].classId;
                        changed = true;
                    }
                }
            }
            if (changed) saveStudentObjects(currentObjs);
            return;
        }

        // Sync: build new list from config, preserving PINs from existing students
        var newObjs = [];
        configStudents.forEach(function(cs) {
            var existing = null;
            for (var i = 0; i < currentObjs.length; i++) {
                if (currentObjs[i].name === cs.name) {
                    existing = currentObjs[i];
                    break;
                }
            }
            if (existing) {
                existing.group = cs.classId;
                newObjs.push(existing);
            } else {
                newObjs.push({ name: cs.name, pin: null, group: cs.classId });
            }
        });

        saveStudentObjects(newObjs);
    }

    // Config 파일에서 학생 목록 동기화
    syncFromConfig();

    return {
        getStudents: getStudents,
        login: login,
        logout: logout,
        getCurrentStudent: getCurrentStudent,
        isLoggedIn: isLoggedIn,
        getKey: getKey,
        addStudent: addStudent,
        removeStudent: removeStudent,
        renameStudent: renameStudent,
        setPin: setPin,
        verifyPin: verifyPin,
        hasPin: hasPin,
        getStudentPin: getStudentPin,
        getAllStudentPins: getAllStudentPins,
        resetPin: resetPin,
        DEFAULT_STUDENTS: DEFAULT_STUDENTS,
        getAllStudents: getAllStudents,
        setAllStudents: setAllStudents,
        onDataChange: onDataChange
    };
})();
