// firebase-sync.js
// Firebase Realtime Database sync via REST API + SSE (no SDK, no npm)
// Namespace: window.DroneSim.FirebaseSync

window.DroneSim = window.DroneSim || {};
window.DroneSim.FirebaseSync = (function() {
    var CONFIG_KEY = 'drone-firebase-url';
    var eventSource = null;
    var listeners = [];
    var lastPushTime = 0;
    var reconnectTimer = null;

    function getUrl() {
        return localStorage.getItem(CONFIG_KEY) || '';
    }

    function normalizeUrl(url) {
        if (!url) return '';
        url = url.trim();
        // Ensure https
        if (url.indexOf('http://') === 0) {
            url = 'https://' + url.slice(7);
        }
        if (url.indexOf('https://') !== 0) {
            url = 'https://' + url;
        }
        // Remove trailing slash(es)
        while (url.charAt(url.length - 1) === '/') {
            url = url.slice(0, -1);
        }
        return url;
    }

    function configure(url) {
        var normalized = normalizeUrl(url);
        if (!normalized) {
            console.warn('[FirebaseSync] configure() called with empty URL');
            return;
        }
        stopListening();
        localStorage.setItem(CONFIG_KEY, normalized);
        startListening();
    }

    function isConfigured() {
        return !!getUrl();
    }

    function push(students) {
        var url = getUrl();
        if (!url) {
            console.warn('[FirebaseSync] push() called but no Firebase URL configured');
            return Promise.reject(new Error('Firebase URL not configured'));
        }
        lastPushTime = Date.now();
        return fetch(url + '/students.json', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(students)
        }).then(function(response) {
            if (!response.ok) {
                console.warn('[FirebaseSync] push() failed, status:', response.status);
                return Promise.reject(new Error('Firebase PUT failed: ' + response.status));
            }
            return response.json();
        }).catch(function(err) {
            console.warn('[FirebaseSync] push() error:', err);
            return Promise.reject(err);
        });
    }

    function onChange(callback) {
        if (typeof callback === 'function') {
            listeners.push(callback);
        }
    }

    function notifyListeners(students) {
        for (var i = 0; i < listeners.length; i++) {
            try {
                listeners[i](students);
            } catch (e) {
                console.warn('[FirebaseSync] listener error:', e);
            }
        }
    }

    function startListening() {
        var url = getUrl();
        if (!url) return;
        if (eventSource) return;

        // Clear any pending reconnect
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }

        var sseUrl = url + '/students.json';

        try {
            eventSource = new EventSource(sseUrl);
        } catch (e) {
            console.warn('[FirebaseSync] EventSource creation failed:', e);
            eventSource = null;
            scheduleReconnect();
            return;
        }

        // Firebase SSE sends named events: 'put', 'patch', 'keep-alive', 'cancel', 'auth_revoked'
        eventSource.addEventListener('put', function(event) {
            // Echo prevention: ignore if within 2 seconds of our own push
            if (Date.now() - lastPushTime < 2000) {
                return;
            }
            try {
                var parsed = JSON.parse(event.data);
                // parsed: { path: "/", data: [...] }
                if (parsed && parsed.path === '/' && parsed.data !== null && parsed.data !== undefined) {
                    var students = parsed.data;
                    // Firebase may return an object with numeric keys if array was stored as object
                    if (!Array.isArray(students)) {
                        // Convert object to array, filtering nulls
                        var arr = [];
                        var keys = Object.keys(students);
                        for (var i = 0; i < keys.length; i++) {
                            if (students[keys[i]] !== null && students[keys[i]] !== undefined) {
                                arr.push(students[keys[i]]);
                            }
                        }
                        students = arr;
                    }
                    notifyListeners(students);
                }
            } catch (e) {
                console.warn('[FirebaseSync] SSE parse error:', e, event.data);
            }
        });

        eventSource.addEventListener('patch', function(event) {
            // For patch events, do a full pull to get latest state
            if (Date.now() - lastPushTime < 2000) {
                return;
            }
            pull().then(function(students) {
                notifyListeners(students);
            }).catch(function(e) {
                console.warn('[FirebaseSync] pull after patch failed:', e);
            });
        });

        eventSource.addEventListener('cancel', function() {
            console.warn('[FirebaseSync] SSE stream cancelled by server');
            stopListening();
        });

        eventSource.addEventListener('auth_revoked', function() {
            console.warn('[FirebaseSync] SSE auth revoked');
            stopListening();
        });

        eventSource.onerror = function() {
            console.warn('[FirebaseSync] SSE connection error, will reconnect in 5s');
            stopListening();
            scheduleReconnect();
        };
    }

    function scheduleReconnect() {
        if (reconnectTimer) return;
        reconnectTimer = setTimeout(function() {
            reconnectTimer = null;
            if (getUrl() && !eventSource) {
                startListening();
            }
        }, 5000);
    }

    function stopListening() {
        if (eventSource) {
            eventSource.close();
            eventSource = null;
        }
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
    }

    function pull() {
        var url = getUrl();
        if (!url) {
            return Promise.reject(new Error('Firebase URL not configured'));
        }
        return fetch(url + '/students.json', {
            method: 'GET',
            cache: 'no-store'
        }).then(function(response) {
            if (!response.ok) {
                console.warn('[FirebaseSync] pull() failed, status:', response.status);
                return Promise.reject(new Error('Firebase GET failed: ' + response.status));
            }
            return response.json();
        }).then(function(data) {
            if (data === null || data === undefined) {
                return [];
            }
            if (Array.isArray(data)) {
                return data;
            }
            // Convert object to array
            var arr = [];
            var keys = Object.keys(data);
            for (var i = 0; i < keys.length; i++) {
                if (data[keys[i]] !== null && data[keys[i]] !== undefined) {
                    arr.push(data[keys[i]]);
                }
            }
            return arr;
        }).catch(function(err) {
            console.warn('[FirebaseSync] pull() error:', err);
            return Promise.reject(err);
        });
    }

    function disconnect() {
        stopListening();
        localStorage.removeItem(CONFIG_KEY);
    }

    // Auto-start if already configured
    if (getUrl()) {
        startListening();
    }

    return {
        getUrl: getUrl,
        configure: configure,
        isConfigured: isConfigured,
        push: push,
        pull: pull,
        onChange: onChange,
        startListening: startListening,
        stopListening: stopListening,
        disconnect: disconnect
    };
})();
