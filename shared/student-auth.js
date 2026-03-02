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

    function getStudents() {
        var stored = localStorage.getItem(STORAGE_KEY);
        if (!stored) {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(DEFAULT_STUDENTS));
            return DEFAULT_STUDENTS.slice();
        }
        try {
            return JSON.parse(stored);
        } catch (e) {
            return DEFAULT_STUDENTS.slice();
        }
    }

    function saveStudents(list) {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
    }

    function login(studentName) {
        sessionStorage.setItem(SESSION_KEY, studentName);
    }

    function logout() {
        sessionStorage.removeItem(SESSION_KEY);
    }

    function getCurrentStudent() {
        return sessionStorage.getItem(SESSION_KEY);
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
        var list = getStudents();
        if (list.indexOf(name) !== -1) return false;
        list.push(name);
        saveStudents(list);
        return true;
    }

    function removeStudent(name) {
        var list = getStudents();
        var idx = list.indexOf(name);
        if (idx === -1) return false;
        list.splice(idx, 1);
        saveStudents(list);
        return true;
    }

    // 학생 이름 변경 + localStorage 데이터 마이그레이션
    function renameStudent(oldName, newName) {
        newName = newName.trim();
        if (!newName || oldName === newName) return false;
        var list = getStudents();
        var idx = list.indexOf(oldName);
        if (idx === -1) return false;
        if (list.indexOf(newName) !== -1) return false;

        list[idx] = newName;
        saveStudents(list);

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
        DEFAULT_STUDENTS: DEFAULT_STUDENTS
    };
})();
