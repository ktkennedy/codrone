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

    // 내부 저장 형식: [{name: '학생01', pin: null}, ...]
    function getStudentObjects() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            var defaultObjs = DEFAULT_STUDENTS.map(function (n) { return { name: n, pin: null }; });
            localStorage.setItem(STORAGE_KEY, JSON.stringify(defaultObjs));
            return defaultObjs;
        }
        try {
            var parsed = JSON.parse(stored);
            // 구버전 호환: 문자열 배열이면 객체 배열로 마이그레이션
            if (parsed.length > 0 && typeof parsed[0] === 'string') {
                var migrated = parsed.map(function (n) { return { name: n, pin: null }; });
                localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
                return migrated;
            }
            return parsed;
        } catch (e) {
            return DEFAULT_STUDENTS.map(function (n) { return { name: n, pin: null }; });
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
        if (!val || val === 'null') return null;
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

    function addStudent(name) {
        name = name.trim();
        if (!name) return false;
        var objs = getStudentObjects();
        var names = objs.map(function (o) { return o.name; });
        if (names.indexOf(name) !== -1) return false;
        objs.push({ name: name, pin: null });
        saveStudentObjects(objs);
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
                return true;
            }
        }
        return false;
    }

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
        DEFAULT_STUDENTS: DEFAULT_STUDENTS
    };
})();
