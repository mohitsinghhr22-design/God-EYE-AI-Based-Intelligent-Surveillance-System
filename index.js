const BACKEND = "http://127.0.0.1:5000";

document.addEventListener("DOMContentLoaded", function () {

    const dateTime = document.getElementById("dateTime");
    const systemStatus = document.getElementById("systemStatus");

    const securityScore = document.getElementById("securityScore");
    const onlineUsers = document.getElementById("onlineUsers");
    const peopleDetected = document.getElementById("peopleDetected");

    const searchInput = document.getElementById("searchInput");

    const locationButton = document.getElementById("locationButton");
    const latitude = document.getElementById("latitude");
    const longitude = document.getElementById("longitude");

    const cameraButton = document.getElementById("cameraButton");
    const stopButton = document.getElementById("stopButton");
    const alertButton = document.getElementById("alertButton");
    const refreshButton = document.getElementById("refreshButton");
    const logoutButton = document.getElementById("logoutButton");
    const cameraFeed = document.getElementById("cameraFeed");
    const cameraOnOffButton = document.getElementById("cameraOnOffButton");
    const fullscreenButton = document.getElementById("fullscreenButton");

    const loginSection = document.getElementById("login");
    const signupSection = document.getElementById("signup");

    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    const showSignup = document.getElementById("showSignup");
    const showLogin = document.getElementById("showLogin");

    const loginMessage = document.getElementById("loginMessage");
    const signupMessage = document.getElementById("signupMessage");

    function updateDateTime() {

        if (!dateTime) return;

        const now = new Date();

        dateTime.textContent =
            now.toLocaleDateString("en-IN", {
                day: "2-digit",
                month: "long",
                year: "numeric"
            }) +
            " | " +
            now.toLocaleTimeString("en-IN");
    }

    updateDateTime();

    setInterval(updateDateTime, 1000);

    function showNotification(message) {

        const notification = document.createElement("div");

        notification.textContent = message;

        notification.style.position = "fixed";
        notification.style.top = "20px";
        notification.style.right = "20px";
        notification.style.background = "#1e3a8a";
        notification.style.color = "white";
        notification.style.padding = "15px 20px";
        notification.style.borderRadius = "8px";
        notification.style.zIndex = "9999";
        notification.style.boxShadow = "0 5px 20px rgba(0,0,0,0.4)";
        notification.style.fontWeight = "bold";

        document.body.appendChild(notification);

        setTimeout(function () {
            notification.remove();
        }, 3000);
    }

    function changeSystemStatus(status) {

        if (!systemStatus) return;

        systemStatus.textContent = status;
    }

    function hideDashboard() {

        document.querySelectorAll("section").forEach(function (section) {

            if (
                section.id !== "login" &&
                section.id !== "signup"
            ) {
                section.style.display = "none";
            }
        });
    }

    function showDashboard() {

        document.querySelectorAll("section").forEach(function (section) {

            if (
                section.id !== "login" &&
                section.id !== "signup"
            ) {
                section.style.display = "";
            }
        });
    }

    function checkLogin() {

        const loggedIn =
            sessionStorage.getItem("godEyeLoggedIn");

        if (loggedIn === "true") {

            if (loginSection) {
                loginSection.style.display = "none";
            }

            if (signupSection) {
                signupSection.style.display = "none";
            }

            showDashboard();

        } else {

            hideDashboard();

            if (loginSection) {
                loginSection.style.display = "block";
            }

            if (signupSection) {
                signupSection.style.display = "none";
            }
        }
    }

    checkLogin();

    if (showSignup) {

        showSignup.addEventListener("click", function (event) {

            event.preventDefault();

            if (loginSection) {
                loginSection.style.display = "none";
            }

            if (signupSection) {
                signupSection.style.display = "block";

                signupSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    }

    if (showLogin) {

        showLogin.addEventListener("click", function (event) {

            event.preventDefault();

            if (signupSection) {
                signupSection.style.display = "none";
            }

            if (loginSection) {
                loginSection.style.display = "block";

                loginSection.scrollIntoView({
                    behavior: "smooth"
                });
            }
        });
    }

    if (signupForm) {

        signupForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            const usernameInput =
                document.getElementById("signupUsername");

            const passwordInput =
                document.getElementById("signupPassword");

            const confirmPasswordInput =
                document.getElementById("confirmPassword");

            const username = usernameInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;

            if (!username || !password || !confirmPassword) {

                signupMessage.textContent =
                    "❌ Please fill all fields.";

                signupMessage.style.color =
                    "#ef4444";

                return;
            }

            if (password.length < 4) {

                signupMessage.textContent =
                    "❌ Password must be at least 4 characters.";

                signupMessage.style.color =
                    "#ef4444";

                return;
            }

            if (password !== confirmPassword) {

                signupMessage.textContent =
                    "❌ Passwords do not match.";

                signupMessage.style.color =
                    "#ef4444";

                return;
            }

            try {

                const response = await fetch(
                    `${BACKEND}/api/signup`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            username: username,
                            password: password
                        })
                    }
                );

                const data = await response.json();

                if (data.success) {

                    signupMessage.textContent =
                        "✅ Account created successfully!";

                    signupMessage.style.color =
                        "#22c55e";

                    usernameInput.value = "";
                    passwordInput.value = "";
                    confirmPasswordInput.value = "";

                    setTimeout(function () {

                        signupSection.style.display = "none";
                        loginSection.style.display = "block";

                        loginSection.scrollIntoView({
                            behavior: "smooth"
                        });

                    }, 1200);

                } else {

                    signupMessage.textContent =
                        "❌ " + data.message;

                    signupMessage.style.color =
                        "#ef4444";
                }

            } catch (error) {

                signupMessage.textContent =
                    "❌ Backend server is not running.";

                signupMessage.style.color =
                    "#ef4444";

                console.error(error);
            }
        });
    }

    if (loginForm) {

        loginForm.addEventListener("submit", async function (event) {

            event.preventDefault();

            const usernameInput =
                document.getElementById("loginUsername");

            const passwordInput =
                document.getElementById("loginPassword");

            const username =
                usernameInput.value.trim();

            const password =
                passwordInput.value;

            if (!username || !password) {

                loginMessage.textContent =
                    "❌ Please enter username and password.";

                loginMessage.style.color =
                    "#ef4444";

                return;
            }

            try {

                const response = await fetch(
                    `${BACKEND}/api/login`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json"
                        },
                        body: JSON.stringify({
                            username: username,
                            password: password
                        })
                    }
                );

                const data = await response.json();

                if (data.success) {

                    sessionStorage.setItem(
                        "godEyeLoggedIn",
                        "true"
                    );

                    sessionStorage.setItem(
                        "godEyeUser",
                        data.username
                    );

                    loginMessage.textContent =
                        "✅ Login successful! Opening God Eye...";

                    loginMessage.style.color =
                        "#22c55e";

                    setTimeout(function () {

                        loginSection.style.display = "none";
                        signupSection.style.display = "none";

                        showDashboard();

                        window.scrollTo({
                            top: 0,
                            behavior: "smooth"
                        });

                        showNotification(
                            "👁️ Welcome to GOD EYE, " +
                            data.username
                        );

                    }, 800);

                } else {

                    loginMessage.textContent =
                        "❌ " + data.message;

                    loginMessage.style.color =
                        "#ef4444";
                }

            } catch (error) {

                loginMessage.textContent =
                    "❌ Backend server is not running.";

                loginMessage.style.color =
                    "#ef4444";

                console.error(error);
            }
        });
    }

    let monitoringActive = false;

    if (cameraButton) {

        cameraButton.addEventListener("click", async function () {

            try {

                const response = await fetch(
                    `${BACKEND}/api/start-monitoring`,
                    {
                        method: "POST"
                    }
                );

                const data = await response.json();

                if (data.success) {

                    monitoringActive = true;

                    changeSystemStatus(
                        "🟢 Monitoring Active"
                    );

                    cameraButton.textContent =
                        "Monitoring Active";

                    showNotification(
                        "📹 Camera monitoring started."
                    );
                }

            } catch (error) {

                showNotification(
                    "❌ Backend server is not running."
                );

                console.error(error);
            }
        });
    }

    if (stopButton) {

        stopButton.addEventListener("click", async function () {

            try {

                const response = await fetch(
                    `${BACKEND}/api/stop-monitoring`,
                    {
                        method: "POST"
                    }
                );

                const data = await response.json();

                if (data.success) {

                    monitoringActive = false;

                    changeSystemStatus(
                        "🟡 Monitoring Stopped"
                    );

                    if (cameraButton) {
                        cameraButton.textContent =
                            "Start Monitoring";
                    }

                    showNotification(
                        "⏹️ Camera monitoring stopped."
                    );
                }

            } catch (error) {

                showNotification(
                    "❌ Backend server is not running."
                );

                console.error(error);
            }
        });
    }

    let cameraVisible = true;

    if (cameraFeed && cameraOnOffButton) {

        cameraFeed.style.display = "block";
        cameraOnOffButton.textContent = "Camera OFF";

        cameraOnOffButton.addEventListener("click", function () {

            if (cameraVisible) {

                cameraVisible = false;
                cameraFeed.style.display = "none";
                cameraOnOffButton.textContent = "Camera ON";

                showNotification("📴 Camera OFF");

            } else {

                cameraVisible = true;
                cameraFeed.style.display = "block";
                cameraOnOffButton.textContent = "Camera OFF";

                showNotification("📹 Camera ON");
            }
        });
    }

    async function updateDetections() {

        try {

            const response = await fetch(
                `${BACKEND}/api/detections`
            );

            const data = await response.json();

            if (peopleDetected) {
                peopleDetected.textContent = data.count;
            }

        } catch (error) {

            console.error(
                "Detection error:",
                error
            );
        }
    }

    updateDetections();

    setInterval(updateDetections, 1000);

    if (alertButton) {

        alertButton.addEventListener("click", function () {

            changeSystemStatus(
                "🔴 SECURITY ALERT"
            );

            showNotification(
                "🚨 SECURITY ALERT ACTIVATED!"
            );

            setTimeout(function () {

                if (monitoringActive) {

                    changeSystemStatus(
                        "🟢 System Online"
                    );
                }

            }, 5000);
        });
    }

    function updateSecurityScore() {

        if (!securityScore) return;

        const score =
            Math.floor(Math.random() * 6) + 95;

        securityScore.textContent =
            score + "%";
    }

    function updateOnlineUsers() {

        if (!onlineUsers) return;

        const users =
            Math.floor(Math.random() * 21) + 110;

        onlineUsers.textContent =
            users;
    }

    if (refreshButton) {

        refreshButton.onclick = async function () {

            showNotification(
                "🔄 Refreshing GOD EYE system..."
            );

            await loadAlerts();
            await loadActivity();
            await loadPeopleCount();
            await loadSystemStatus();
            await loadFaceDetection();
            await loadObjects();

            updateDetections();
            updateSecurityScore();
            updateOnlineUsers();

            showNotification(
                "✅ GOD EYE refreshed successfully."
            );
        };
    }

    updateSecurityScore();
    updateOnlineUsers();

    setInterval(function () {

        if (
            sessionStorage.getItem("godEyeLoggedIn")
            === "true"
        ) {

            updateSecurityScore();
            updateOnlineUsers();
        }

    }, 10000);

    if (locationButton) {

        locationButton.addEventListener(
            "click",
            function () {

                if (!navigator.geolocation) {

                    showNotification(
                        "❌ Geolocation is not supported."
                    );

                    return;
                }

                showNotification(
                    "📍 Getting your location..."
                );

                navigator.geolocation.getCurrentPosition(

                    function (position) {

                        const lat =
                            position.coords.latitude;

                        const lon =
                            position.coords.longitude;

                        if (latitude) {
                            latitude.textContent =
                                lat.toFixed(6);
                        }

                        if (longitude) {
                            longitude.textContent =
                                lon.toFixed(6);
                        }

                        showNotification(
                            "📍 Location detected successfully."
                        );
                    },

                    function (error) {

                        if (latitude) {
                            latitude.textContent =
                                "Not available";
                        }

                        if (longitude) {
                            longitude.textContent =
                                "Not available";
                        }

                        showNotification(
                            "❌ Unable to get location."
                        );

                        console.log(
                            "Location error:",
                            error.message
                        );
                    }
                );
            }
        );
    }

    if (searchInput) {

        searchInput.addEventListener(
            "input",
            function () {

                const searchText =
                    searchInput.value
                        .toLowerCase()
                        .trim();

                const sections =
                    document.querySelectorAll("section");

                sections.forEach(function (section) {

                    if (
                        section.id === "login" ||
                        section.id === "signup"
                    ) {
                        return;
                    }

                    const sectionText =
                        section.textContent.toLowerCase();

                    if (
                        searchText === "" ||
                        sectionText.includes(searchText)
                    ) {

                        section.style.display = "";

                    } else {

                        section.style.display = "none";
                    }
                });
            }
        );
    }

    const navLinks =
        document.querySelectorAll("nav a");

    navLinks.forEach(function (link) {

        link.addEventListener("click", function () {

            navLinks.forEach(function (item) {
                item.style.color = "#cbd5e1";
            });

            link.style.color = "#38bdf8";
        });
    });

    if (logoutButton) {

        logoutButton.addEventListener(
            "click",
            async function () {

                sessionStorage.removeItem(
                    "godEyeLoggedIn"
                );

                sessionStorage.removeItem(
                    "godEyeUser"
                );

                if (monitoringActive) {

                    try {

                        await fetch(
                            `${BACKEND}/api/stop-monitoring`,
                            {
                                method: "POST"
                            }
                        );

                    } catch (error) {

                        console.error(error);
                    }
                }

                monitoringActive = false;

                hideDashboard();

                if (signupSection) {
                    signupSection.style.display =
                        "none";
                }

                if (loginSection) {

                    loginSection.style.display =
                        "block";

                    loginSection.scrollIntoView({
                        behavior: "smooth"
                    });
                }

                const usernameInput =
                    document.getElementById(
                        "loginUsername"
                    );

                const passwordInput =
                    document.getElementById(
                        "loginPassword"
                    );

                if (usernameInput) {
                    usernameInput.value = "";
                }

                if (passwordInput) {
                    passwordInput.value = "";
                }

                if (loginMessage) {
                    loginMessage.textContent = "";
                }

                changeSystemStatus(
                    "🔒 Logged Out"
                );

                showNotification(
                    "👋 You have been logged out."
                );
            }
        );
    }

    if (
        sessionStorage.getItem("godEyeLoggedIn")
        === "true"
    ) {

        changeSystemStatus(
            "🟢 System Online"
        );

    } else {

        changeSystemStatus(
            "🔒 Login Required"
        );
    }

    if (fullscreenButton && cameraFeed) {

        fullscreenButton.addEventListener(
            "click",
            function () {

                if (!document.fullscreenElement) {

                    if (cameraFeed.requestFullscreen) {

                        cameraFeed.requestFullscreen();

                    } else if (cameraFeed.webkitRequestFullscreen) {

                        cameraFeed.webkitRequestFullscreen();
                    }

                    fullscreenButton.textContent =
                        "⛶ Exit Full Screen";

                } else {

                    if (document.exitFullscreen) {

                        document.exitFullscreen();

                    } else if (document.webkitExitFullscreen) {

                        document.webkitExitFullscreen();
                    }

                    fullscreenButton.textContent =
                        "⛶ Full Screen";
                }
            }
        );

        document.addEventListener(
            "fullscreenchange",
            function () {

                if (!document.fullscreenElement) {

                    fullscreenButton.textContent =
                        "⛶ Full Screen";
                }
            }
        );
    }

    console.log(
        "👁️ GOD EYE System Initialized Successfully"
    );
});


async function loadAlerts() {

    try {

        const response = await fetch(
            `${BACKEND}/api/alerts?refresh=${Date.now()}`
        );

        const data = await response.json();

        const alerts =
            data.alerts || [];

        const activeAlerts =
            document.getElementById(
                "activeAlerts"
            );

        const alertCount =
            document.getElementById(
                "alertCount"
            );

        if (activeAlerts) {
            activeAlerts.textContent =
                alerts.length;
        }

        if (alertCount) {
            alertCount.textContent =
                alerts.length;
        }

        const alertList =
            document.getElementById(
                "alertList"
            );

        if (!alertList) return;

        alertList.innerHTML = "";

        if (alerts.length === 0) {

            alertList.innerHTML =
                "<li>No active alerts</li>";

            return;
        }

        alerts
            .slice()
            .reverse()
            .forEach(function (alert) {

                const li =
                    document.createElement("li");

                li.textContent =
                    `${alert.time} - ${alert.message}`;

                alertList.appendChild(li);
            });

    } catch (error) {

        console.error(
            "Alert loading failed:",
            error
        );
    }
}


async function loadActivity() {

    try {

        const response = await fetch(
            `${BACKEND}/api/activity?refresh=${Date.now()}`
        );

        const data =
            await response.json();

        const activities =
            data.activities || [];

        const tableBody =
            document.getElementById(
                "activityTableBody"
            );

        if (!tableBody) return;

        tableBody.innerHTML = "";

        if (activities.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="5">
                        No activity detected
                    </td>
                </tr>
            `;

            return;
        }

        const currentTime =
            new Date().toLocaleTimeString();

        activities.forEach(function (person) {

            const row =
                document.createElement("tr");

            let status =
                "Normal";

            if (
                person.activity ===
                "MOVING"
            ) {
                status = "Active";
            }

            if (
                person.activity ===
                "NEW"
            ) {
                status = "Detected";
            }

            row.innerHTML = `
                <td>${currentTime}</td>
                <td>${person.id}</td>
                <td>${person.activity}</td>
                <td>Camera 1</td>
                <td>${status}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Activity loading failed:",
            error
        );
    }
}


async function loadPeopleCount() {

    try {

        const response = await fetch(
            `${BACKEND}/api/detections?refresh=${Date.now()}`
        );

        const data =
            await response.json();

        const peopleDetected =
            document.getElementById(
                "peopleDetected"
            );

        if (peopleDetected) {

            peopleDetected.textContent =
                data.count;
        }

    } catch (error) {

        console.error(
            "People count failed:",
            error
        );
    }
}


async function loadSystemStatus() {

    try {

        const response = await fetch(
            `${BACKEND}/api/status?refresh=${Date.now()}`
        );

        const data = await response.json();

        const systemStatus =
            document.getElementById("systemStatus");

        if (systemStatus) {

            systemStatus.textContent =
                `System: ${data.status} | Monitoring: ${
                    data.monitoring
                        ? "ON"
                        : "OFF"
                }`;
        }

        const dashboardStatus =
            document.querySelector(
                "#dashboard p strong"
            );

        if (dashboardStatus) {

            const parent =
                dashboardStatus.parentElement;

            parent.innerHTML =
                `<strong>System status:</strong> ${data.status} 🟢`;
        }

    } catch (error) {

        console.error(
            "System status failed:",
            error
        );
    }
}


async function loadFaceDetection() {

    try {

        const response = await fetch(
            `${BACKEND}/api/faces?refresh=${Date.now()}`
        );

        const data =
            await response.json();

        const count =
            data.count || 0;

        const faces =
            data.faces || [];

        const faceCount =
            document.getElementById(
                "faceCount"
            );

        if (faceCount) {

            faceCount.textContent =
                count;
        }

        const faceStatus =
            document.getElementById(
                "faceStatus"
            );

        if (faceStatus) {

            if (count > 0) {

                faceStatus.textContent =
                    "Face Detected";

            } else {

                faceStatus.textContent =
                    "Active - No Face";
            }
        }

        const tableBody =
            document.getElementById(
                "faceTableBody"
            );

        if (!tableBody) return;

        tableBody.innerHTML = "";

        if (faces.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="4">
                        No face detected
                    </td>
                </tr>
            `;

            return;
        }

        faces.forEach(function (face) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${face.id}</td>
                <td>${face.person}</td>
                <td>${face.status}</td>
                <td>${face.confidence}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Face Detection Error:",
            error
        );
    }
}


async function loadObjects() {

    try {

        const response = await fetch(
            `${BACKEND}/api/objects?refresh=${Date.now()}`
        );

        const data =
            await response.json();

        const total =
            data.total || 0;

        const objects =
            data.objects || [];

        const objectTotal =
            document.getElementById(
                "objectTotal"
            );

        if (objectTotal) {

            objectTotal.textContent =
                total;
        }

        const tableBody =
            document.getElementById(
                "objectTableBody"
            );

        if (!tableBody) return;

        tableBody.innerHTML = "";

        if (objects.length === 0) {

            tableBody.innerHTML = `
                <tr>
                    <td colspan="3">
                        No objects detected
                    </td>
                </tr>
            `;

            return;
        }

        objects.forEach(function (item) {

            const row =
                document.createElement("tr");

            row.innerHTML = `
                <td>${item.object}</td>
                <td>${item.count}</td>
                <td>${item.confidence}</td>
            `;

            tableBody.appendChild(row);
        });

    } catch (error) {

        console.error(
            "Object Detection Error:",
            error
        );
    }
}


async function updateGodEyeDashboard() {

    await Promise.all([
        loadAlerts(),
        loadActivity(),
        loadPeopleCount(),
        loadSystemStatus(),
        loadFaceDetection(),
        loadObjects()
    ]);
}


updateGodEyeDashboard();

setInterval(
    updateGodEyeDashboard,
    2000
);