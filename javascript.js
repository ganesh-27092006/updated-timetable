const API_URL = "https://script.google.com/macros/s/AKfycbzudGCT58x0lPGOe4T_0Yp0RQBXTxtOObmLkGxYplLleun8Mmfr4zTsmgq3EXCeQLvc/exec";

let db = {};
let times = [];
let saturdayTimes = [];
let days = [];
let allRooms = [];
let originalTimetable = [];
let timetable = [];

let studentViewMode = "daily";
let teacherViewMode = "daily";

function clean(value) {
return String(value == null ? "" : value).trim();
}

function escapeHTML(value) {
return String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
})[character]);
}

/* =========================
LOAD DATABASE
========================= */

async function loadDatabase() {
try {
const response = await fetch(API_URL + "?action=get&t=" + Date.now());

    if (!response.ok) {
        throw new Error("API connection failed");
    }

    const data = await response.json();

    if (!data.success) {
        throw new Error(data.message || "Failed to load data");
    }

    db = data;

    times = (data.meta.times || []).map(clean);
    saturdayTimes = (data.meta.saturdayTimes || []).map(clean);
    days = (data.meta.days || []).map(clean);
    allRooms = (data.meta.allRooms || []).map(clean);

    timetable = (data.timetable || []).map(item => ({
        id: clean(item.id),
        day: clean(item.day),
        class: clean(item.class),
        time: clean(item.time),
        subject: clean(item.subject),
        teacher: clean(item.teacher),
        room: clean(item.room)
    }));

    originalTimetable = JSON.parse(JSON.stringify(timetable));

    console.log("GOOGLE SHEET DATA:", timetable);
    console.log("TOTAL LECTURES:", timetable.length);

} catch (error) {
    console.error("Google Sheet Error:", error);
    alert("Failed to load timetable from Google Sheet: " + error.message);
}

}

/* =========================
SEND DATA TO API
========================= */

async function sendToAPI(data) {

const response = await fetch(API_URL, {
    method: "POST",
    body: JSON.stringify(data)
});

const text = await response.text();

let result;

try {
    result = JSON.parse(text);
} catch (e) {
    throw new Error("Invalid response from Google Sheet API");
}

if (!result.success) {
    throw new Error(result.message || "API request failed");
}

return result;

}

/* =========================
PAGE NAVIGATION
========================= */

function hideAll() {
document.querySelectorAll(".card").forEach(card => {
card.classList.add("hidden");
});
}

function goHome() {
hideAll();

const home = document.getElementById("home");

if (home) {
    home.classList.remove("hidden");
}

}

function showStudent() {
hideAll();

const student = document.getElementById("student");

if (student) {
    student.classList.remove("hidden");
}

setToday("studentDate");

const name = document.getElementById("studentName");
const year = document.getElementById("studentYear");
const stream = document.getElementById("studentStream");
const streamBox = document.getElementById("streamBox");
const result = document.getElementById("studentResult");

if (name) name.value = "";
if (year) year.value = "";
if (stream) stream.value = "";

if (streamBox) {
    streamBox.classList.add("hidden");
}

if (result) {
    result.innerHTML = "";
}

setStudentView("daily");

}

function showTeacher() {
hideAll();

const teacher = document.getElementById("teacher");

if (teacher) {
    teacher.classList.remove("hidden");
}

loadTeachersDropdown();

setToday("teacherDate");
setToday("teacherCheckDate");

setTeacherView("daily");

}

function showAdmin() {
hideAll();

const adminLogin = document.getElementById("adminLogin");

if (adminLogin) {
    adminLogin.classList.remove("hidden");
}

}

/* =========================
STUDENT YEAR + STREAM
========================= */

function yearChanged() {

const yearElement = document.getElementById("studentYear");
const box = document.getElementById("streamBox");
const streamSelect = document.getElementById("studentStream");

if (!yearElement) return;

const year = clean(yearElement.value);

if (
    year === "BCA-I" ||
    year === "BCA-II" ||
    year === "BCA-III"
) {

    if (box) {
        box.classList.remove("hidden");
    }

} else {

    if (box) {
        box.classList.add("hidden");
    }

    if (streamSelect) {
        streamSelect.value = "";
    }
}

}

/* =========================
GET EXACT STUDENT CLASS
========================= */

function getStudentClass() {

const yearElement = document.getElementById("studentYear");
const streamElement = document.getElementById("studentStream");

if (!yearElement || !streamElement) {
    return "";
}

const year = clean(yearElement.value);
const stream = clean(streamElement.value);

if (!year || !stream) {
    return "";
}

// EXACT Google Sheet class name
return year + " (" + stream + ")";

}

/* =========================
STUDENT VIEW
========================= */

function setStudentView(mode) {

studentViewMode = mode;

const dailyBtn = document.getElementById("studentBtnDaily");
const weeklyBtn = document.getElementById("studentBtnWeekly");
const dateBox = document.getElementById("studentDateBox");

if (mode === "daily") {

    if (dailyBtn) dailyBtn.classList.add("active");
    if (weeklyBtn) weeklyBtn.classList.remove("active");

    if (dateBox) {
        dateBox.classList.remove("hidden");
    }

} else {

    if (weeklyBtn) weeklyBtn.classList.add("active");
    if (dailyBtn) dailyBtn.classList.remove("active");

    if (dateBox) {
        dateBox.classList.add("hidden");
    }
}

}

/* =========================
TEACHER VIEW
========================= */

function setTeacherView(mode) {

teacherViewMode = mode;

const dailyBtn = document.getElementById("teacherBtnDaily");
const weeklyBtn = document.getElementById("teacherBtnWeekly");
const availabilityBtn = document.getElementById("teacherBtnAvailability");

const dateBox = document.getElementById("teacherDateBox");
const availabilityBox = document.getElementById("teacherAvailabilityBox");
const actionBtn = document.getElementById("teacherActionBtn");

if (dailyBtn) dailyBtn.classList.remove("active");
if (weeklyBtn) weeklyBtn.classList.remove("active");
if (availabilityBtn) availabilityBtn.classList.remove("active");

if (mode === "daily") {

    if (dailyBtn) dailyBtn.classList.add("active");

    if (dateBox) dateBox.classList.remove("hidden");
    if (availabilityBox) availabilityBox.classList.add("hidden");

    if (actionBtn) {
        actionBtn.style.display = "inline-block";
        actionBtn.innerText = "Show Timetable";
    }

} else if (mode === "weekly") {

    if (weeklyBtn) weeklyBtn.classList.add("active");

    if (dateBox) dateBox.classList.add("hidden");
    if (availabilityBox) availabilityBox.classList.add("hidden");

    if (actionBtn) {
        actionBtn.style.display = "inline-block";
        actionBtn.innerText = "Show Timetable";
    }

} else {

    if (availabilityBtn) availabilityBtn.classList.add("active");

    if (dateBox) dateBox.classList.add("hidden");
    if (availabilityBox) availabilityBox.classList.remove("hidden");

    if (actionBtn) {
        actionBtn.style.display = "none";
    }

    checkTeacherAvailability();
}

}

/* =========================
TEACHER DROPDOWNS
========================= */

function loadTeachersDropdown() {

const teachers = [
    ...new Set(
        timetable
            .map(x => clean(x.teacher))
            .filter(x => x !== "")
    )
];

const select = document.getElementById("teacherSelect");

if (select) {

    select.innerHTML = "<option value=''>Select Teacher</option>";

    teachers.forEach(t => {

        const option = document.createElement("option");

        option.value = t;
        option.textContent = t;

        select.appendChild(option);
    });
}

const filterSelect = document.getElementById("filterTeacher");

if (filterSelect) {

    const oldValue = filterSelect.value;

    filterSelect.innerHTML =
        "<option value=''>All Teachers</option>";

    teachers.forEach(t => {

        const option = document.createElement("option");

        option.value = t;
        option.textContent = t;

        filterSelect.appendChild(option);
    });

    filterSelect.value = oldValue;
}

}

/* =========================
STUDENT TIMETABLE
========================= */

function loadStudentTimetableDisplay() {

const nameElement = document.getElementById("studentName");
const yearElement = document.getElementById("studentYear");
const streamElement = document.getElementById("studentStream");
const resultElement = document.getElementById("studentResult");

if (!nameElement || !yearElement || !streamElement || !resultElement) {
    return;
}

const name = clean(nameElement.value);
const year = clean(yearElement.value);
const stream = clean(streamElement.value);

if (!name) {
    alert("Please enter your name.");
    return;
}

if (!year) {
    alert("Please select your year.");
    return;
}

if (!stream) {
    alert("Please select AI or DS stream.");
    return;
}

const cls = getStudentClass();

if (!cls) {
    alert("Please select year and stream.");
    return;
}

console.log("STUDENT SELECTED CLASS:", cls);

if (studentViewMode === "daily") {

    const dateElement = document.getElementById("studentDate");

    if (!dateElement || !dateElement.value) {
        alert("Please select a date.");
        return;
    }

    const date = dateElement.value;

    const day = new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
    );

    const data = timetable.filter(x =>
        clean(x.day).toLowerCase() === day.toLowerCase() &&
        clean(x.class).toLowerCase() === cls.toLowerCase()
    );

    let html =
        "<div class='info'>" +
        "<b>Student:</b> " + name + "<br>" +
        "<b>Class:</b> " + cls + "<br>" +
        "<b>Date:</b> " + date + " (" + day + ")" +
        "</div>";

    if (data.length === 0) {

        html +=
            "<h3>No lectures scheduled for " +
            cls +
            " on this day.</h3>";

    } else {

        html += createDayTable(day, cls, data);
    }

    resultElement.innerHTML = html;

} else {

    let html =
        "<div class='info'>" +
        "<b>Student:</b> " + name + "<br>" +
        "<b>Class:</b> " + cls +
        "</div>" +
        "<h3>Weekly Time Table</h3>";

    let found = false;

    days.forEach(day => {

        const dayData = timetable.filter(x =>
            clean(x.day).toLowerCase() === clean(day).toLowerCase() &&
            clean(x.class).toLowerCase() === cls.toLowerCase()
        );

        if (dayData.length > 0) {

            found = true;

            html += "<h4>" + day + "</h4>";

            html += createDayTable(
                day,
                cls,
                dayData
            );
        }
    });

    if (!found) {
        html +=
            "<h3>No lectures found for " +
            cls +
            ".</h3>";
    }

    resultElement.innerHTML = html;
}

}

/* =========================
TEACHER TIMETABLE
========================= */

function loadTeacherTimetableDisplay() {

const teacherElement = document.getElementById("teacherSelect");

if (!teacherElement) return;

const teacher = clean(teacherElement.value);

if (!teacher) {
    alert("Please select a teacher.");
    return;
}

if (teacherViewMode === "daily") {

    const dateElement = document.getElementById("teacherDate");

    if (!dateElement || !dateElement.value) {
        alert("Please select a date.");
        return;
    }

    const date = dateElement.value;

    const day = new Date(
        date + "T00:00:00"
    ).toLocaleDateString(
        "en-US",
        {
            weekday: "long"
        }
    );

    const data = timetable.filter(x =>
        clean(x.day).toLowerCase() === day.toLowerCase() &&
        clean(x.teacher).toLowerCase() === teacher.toLowerCase()
    );

    let html =
        "<div class='info'>" +
        "<b>Teacher:</b> " + teacher + "<br>" +
        "<b>Date:</b> " + date + " (" + day + ")" +
        "</div>";

    if (data.length === 0) {

        html +=
            "<h3>No lectures scheduled for this day.</h3>";

    } else {

        html +=
            "<div class='table-scroll'>" +
            "<table>" +
            "<tr>" +
            "<th>Time</th>" +
            "<th>Class</th>" +
            "<th>Subject</th>" +
            "<th>Room</th>" +
            "</tr>";

        data.forEach(x => {

            html +=
                "<tr>" +
                "<td>" + x.time + "</td>" +
                "<td>" + x.class + "</td>" +
                "<td>" + x.subject + "</td>" +
                "<td>" + x.room + "</td>" +
                "</tr>";
        });

        html += "</table></div>";
    }

    document.getElementById("teacherResult").innerHTML = html;

} else if (teacherViewMode === "weekly") {

    let html =
        "<div class='info'>" +
        "<b>Teacher:</b> " + teacher +
        "</div>" +
        "<h3>Weekly Teaching Schedule</h3>";

    let found = false;

    days.forEach(day => {

        const dayData = timetable.filter(x =>
            clean(x.day).toLowerCase() === clean(day).toLowerCase() &&
            clean(x.teacher).toLowerCase() === teacher.toLowerCase()
        );

        if (dayData.length > 0) {

            found = true;

            html += "<h4>" + day + "</h4>";

            html +=
                "<div class='table-scroll'>" +
                "<table>" +
                "<tr>" +
                "<th>Time</th>" +
                "<th>Class</th>" +
                "<th>Subject</th>" +
                "<th>Room</th>" +
                "</tr>";

            dayData.forEach(x => {

                html +=
                    "<tr>" +
                    "<td>" + x.time + "</td>" +
                    "<td>" + x.class + "</td>" +
                    "<td>" + x.subject + "</td>" +
                    "<td>" + x.room + "</td>" +
                    "</tr>";
            });

            html += "</table></div>";
        }
    });

    if (!found) {
        html += "<h3>No lectures found.</h3>";
    }

    document.getElementById("teacherResult").innerHTML = html;
}

}

/* =========================
TEACHER AVAILABILITY
========================= */

function teacherSelectionChanged() {
    if (teacherViewMode === "availability") {
        checkTeacherAvailability();
    }
}

function checkTeacherAvailability() {

const dateElement =
    document.getElementById("teacherCheckDate");
const teacherElement =
    document.getElementById("teacherSelect");
const resultElement =
    document.getElementById("teacherResult");

if (!dateElement || !teacherElement || !resultElement) {
    return;
}

const teacher = clean(teacherElement.value);

if (!teacher) {
    resultElement.innerHTML =
        "<p>Please select a teacher to see when they and student groups are free.</p>";
    return;
}

if (!dateElement.value) {
    resultElement.innerHTML =
        "<p>Please select a date to check availability.</p>";
    return;
}

const date = dateElement.value;

const day = new Date(
    date + "T00:00:00"
).toLocaleDateString(
    "en-US",
    {
        weekday: "long"
    }
);

const slotList =
    day === "Saturday"
        ? saturdayTimes
        : times;

let html =
    "<h4>When " +
    teacher +
    " and student groups are free on " +
    date +
    " (" +
    day +
    ")</h4>";

html +=
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Time Slot</th>" +
    "<th>Teacher</th>" +
    "<th>Free Student Groups</th>" +
    "<th>Engaged Student Groups</th>" +
    "</tr>";

const classGroups = [
    ...new Set(
        timetable
            .map(x => clean(x.class))
            .filter(Boolean)
    )
];
let foundAvailability = false;

slotList.forEach(time => {

    const bookedEntries = timetable.filter(x =>
        clean(x.day).toLowerCase() === day.toLowerCase() &&
        clean(x.time) === clean(time)
    );
    const teacherBusy = bookedEntries.some(entry =>
        clean(entry.teacher).toLowerCase() === teacher.toLowerCase()
    );

    if (teacherBusy) {
        return;
    }

    const occupiedGroups = bookedEntries.map(x =>
        clean(x.class).toLowerCase()
    );
    const freeGroups = classGroups.filter(group =>
        !occupiedGroups.includes(group.toLowerCase())
    );

    if (freeGroups.length === 0) {
        return;
    }

    foundAvailability = true;
    html +=
        "<tr>" +
        "<td><b>" + time + "</b></td>" +
        "<td><span class='available-badge'>Free</span></td>" +
        "<td style='text-align:left;'>";

    html +=
        "<span class='available-badge'>" +
        freeGroups.join(", ") +
        "</span></td><td style='text-align:left;'>";

    const engagedEntries = bookedEntries.filter(entry =>
        clean(entry.class) !== "" &&
        occupiedGroups.includes(clean(entry.class).toLowerCase())
    );

    if (engagedEntries.length > 0) {
        engagedEntries.forEach(entry => {
            html +=
                "<small><b>" +
                entry.class +
                "</b>: " +
                entry.subject +
                " — " +
                entry.teacher +
                "</small><br>";
        });
    } else {
        html += "<small>None</small>";
    }

    html += "</td></tr>";
});

if (!foundAvailability) {
    html +=
        "<tr><td colspan='4'>No time slots found when " +
        teacher +
        " and a student group are both free.</td></tr>";
}

html += "</table></div>";

resultElement.innerHTML = html;

}

/* =========================
ADMIN AVAILABILITY
========================= */

function runAdminAvailabilityCheck() {

const dateElement =
    document.getElementById("adminCheckDate");

const modeElement =
    document.getElementById("adminAvailabilityMode");

const dayElement =
    document.getElementById("adminCheckDay");

const roomElement =
    document.getElementById("adminCheckRoom");

const yearElement =
    document.getElementById("adminAvailabilityYear");

const streamElement =
    document.getElementById("adminAvailabilityStream");

const container =
    document.getElementById("adminAvailabilityResult");

if (
    !dateElement ||
    !modeElement ||
    !dayElement ||
    !roomElement ||
    !yearElement ||
    !streamElement ||
    !container
) {
    return;
}

const mode = modeElement.value;
const specificRoom = roomElement.value;
const selectedYear = yearElement.value;
const selectedStream = streamElement.value;
const roomsToCheck =
    specificRoom
        ? [specificRoom]
        : allRooms;

let daysToCheck = [];
let heading = "";

if (mode === "date") {
    if (!dateElement.value) {
        container.innerHTML =
            "<p style='color:#666;'>Please select a date to check availability.</p>";
        return;
    }

    const date = dateElement.value;
    const dateDay = new Date(date + "T00:00:00").toLocaleDateString(
        "en-US",
        { weekday: "long" }
    );
    daysToCheck = [dateDay];
    heading = "Availability for " + date + " (" + dateDay + ")";
} else if (mode === "day") {
    if (!dayElement.value) {
        container.innerHTML =
            "<p style='color:#666;'>Please select a day to check availability.</p>";
        return;
    }

    daysToCheck = [dayElement.value];
    heading = "Availability for " + dayElement.value;
} else {
    daysToCheck = days;
    heading = "Availability for All Days";
}

const classGroups = [
    ...new Set(
        timetable
            .map(item => clean(item.class))
            .filter(Boolean)
    )
];

const filteredClassGroups = classGroups.filter(group => {
    const normalizedGroup = group.toUpperCase();
    const yearMatches =
        !selectedYear ||
        normalizedGroup === selectedYear ||
        normalizedGroup.startsWith(selectedYear + " (");
    const streamMatch = normalizedGroup.match(/\((AI|DS)\)/);
    const streamMatches =
        !selectedStream ||
        (streamMatch && streamMatch[1] === selectedStream);

    return yearMatches && streamMatches;
});

const teachers = [
    ...new Set(
        timetable
            .map(item => clean(item.teacher))
            .filter(Boolean)
    )
];

const escapeHTML = value =>
    String(value == null ? "" : value).replace(/[&<>"']/g, character => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        "\"": "&quot;",
        "'": "&#39;"
    })[character]);

let html = "<h4>" + escapeHTML(heading);
if (specificRoom) {
    html += " — " + escapeHTML(specificRoom);
}
if (selectedYear) {
    html += " — " + escapeHTML(selectedYear);
}
if (selectedStream) {
    html += " (" + escapeHTML(selectedStream) + ")";
}
html += "</h4>";

html +=
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Day</th>" +
    "<th>Time Slot</th>" +
    "<th>Available Teachers</th>" +
    "<th>Free Student Groups</th>" +
    "<th>Available Rooms</th>" +
    "<th>Current Occupants</th>" +
    "</tr>";

daysToCheck.forEach(day => {
    const slotList =
        clean(day).toLowerCase() === "saturday"
            ? saturdayTimes
            : times;

    slotList.forEach(time => {
        const booked = timetable.filter(item =>
            clean(item.day).toLowerCase() === clean(day).toLowerCase() &&
            clean(item.time) === clean(time)
        );

        const occupiedRooms = booked.map(item => clean(item.room));
        const freeRooms = roomsToCheck.filter(room =>
            !occupiedRooms.some(occupiedRoom =>
                occupiedRoom.toLowerCase() === clean(room).toLowerCase()
            )
        );
        const occupiedTeachers = booked.map(item =>
            clean(item.teacher).toLowerCase()
        );
        const freeTeachers = teachers.filter(teacher =>
            !occupiedTeachers.includes(teacher.toLowerCase())
        );
        const occupiedGroups = booked.map(item =>
            clean(item.class).toLowerCase()
        );
        const freeGroups = filteredClassGroups.filter(group =>
            !occupiedGroups.includes(group.toLowerCase())
        );

        html +=
            "<tr>" +
            "<td>" + escapeHTML(day) + "</td>" +
            "<td><b>" + escapeHTML(time) + "</b></td>" +
            "<td style='text-align:left;'>" +
            (freeTeachers.length
                ? "<span class='available-badge'>" + escapeHTML(freeTeachers.join(", ")) + "</span>"
                : "<span class='occupied-badge'>None</span>") +
            "</td>" +
            "<td style='text-align:left;'>" +
            (freeGroups.length
                ? "<span class='available-badge'>" + escapeHTML(freeGroups.join(", ")) + "</span>"
                : "<span class='occupied-badge'>None</span>") +
            "</td>" +
            "<td>" +
            (freeRooms.length
                ? "<span class='available-badge'>" + escapeHTML(freeRooms.join(", ")) + "</span>"
                : "<span class='occupied-badge'>None</span>") +
            "</td>" +
            "<td style='text-align:left;'><small>";

        if (booked.length > 0) {
            booked.forEach(item => {
                html +=
                    "<b>" + escapeHTML(item.room || "Room not set") + "</b>: " +
                    escapeHTML(item.class || "Class not set") +
                    " (" + escapeHTML(item.subject || "Subject not set") + ") — " +
                    escapeHTML(item.teacher || "Teacher not set") + "<br>";
            });
        } else {
            html += "No current occupants";
        }

        html += "</small></td></tr>";
    });
});

html += "</table></div>";

container.innerHTML = html;

}

function updateAdminAvailabilityFilters() {
    const modeElement =
        document.getElementById("adminAvailabilityMode");
    const dateFilter =
        document.getElementById("adminAvailabilityDateFilter");
    const dayFilter =
        document.getElementById("adminAvailabilityDayFilter");

    if (!modeElement || !dateFilter || !dayFilter) {
        return;
    }

    dateFilter.classList.toggle("hidden", modeElement.value !== "date");
    dayFilter.classList.toggle("hidden", modeElement.value !== "day");
    runAdminAvailabilityCheck();
}

/* =========================
DAY TABLE
========================= */

function createDayTable(day, cls, data) {

const slotList =
    clean(day) === "Saturday"
        ? saturdayTimes
        : times;

let html =
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Time</th>" +
    "<th>Subject</th>" +
    "<th>Teacher</th>" +
    "<th>Room</th>" +
    "</tr>";

slotList.forEach(time => {

    const lecture = data.find(x =>
        clean(x.time) === clean(time)
    );

    if (lecture) {

        const isLab =
            clean(lecture.subject)
                .toUpperCase()
                .includes("LAB");

        html +=
            "<tr>" +
            "<td>" + time + "</td>" +
            "<td>" +
            "<div class='lecture " +
            (isLab ? "lab" : "") +
            "'>" +
            "<b>" +
            lecture.subject +
            "</b>" +
            "</div>" +
            "</td>" +
            "<td>" +
            (lecture.teacher || "-") +
            "</td>" +
            "<td>" +
            lecture.room +
            "</td>" +
            "</tr>";

    } else {

        html +=
            "<tr>" +
            "<td>" + time + "</td>" +
            "<td colspan='3' class='free'>Free</td>" +
            "</tr>";
    }
});

html += "</table></div>";

return html;

}

/* =========================
ADMIN LOGIN
========================= */

function adminLogin() {

const idElement =
    document.getElementById("adminId");

const passwordElement =
    document.getElementById("adminPassword");

const loginMsg =
    document.getElementById("loginMsg");

if (!idElement || !passwordElement) {
    return;
}

const id = idElement.value;
const password = passwordElement.value;

if (id === "admin" && password === "1234") {

    hideAll();

    const panel =
        document.getElementById("adminPanel");

    if (panel) {
        panel.classList.remove("hidden");
    }

    setToday("adminCheckDate");

    loadAdmin();
    setAdminView("dashboard");

} else {

    if (loginMsg) {
        loginMsg.innerHTML =
            "❌ Wrong ID or Password";
    }
}

}

/* =========================
ADMIN TIME OPTIONS
========================= */

function loadTimeOptions() {

const select =
    document.getElementById("aTime");

if (!select) return;

select.innerHTML = "";

[
    ...times,
    ...saturdayTimes
]
    .filter(
        (x, i, a) =>
            a.indexOf(x) === i
    )
    .forEach(t => {

        const option =
            document.createElement("option");

        option.value = t;
        option.textContent = t;

        select.appendChild(option);
    });

}

/* =========================
ADMIN LOAD
========================= */

function loadAdmin() {

loadTimeOptions();

loadAdminAvailabilityRooms();

loadTeachersDropdown();

populateAdminViewFilters();

loadAdminTable();

runAdminAvailabilityCheck();

renderClassTimetable();
renderTeacherTimetable();
renderSubjectAllocations();
updateAdminDashboardStats();

}

function setAdminView(viewName) {
    const views = document.querySelectorAll(".admin-view");
    views.forEach(view => view.classList.add("hidden"));

    const selectedView =
        document.getElementById("adminView" + viewName.charAt(0).toUpperCase() + viewName.slice(1));
    if (selectedView) {
        selectedView.classList.remove("hidden");
    }

    document.querySelectorAll(".admin-nav-item").forEach(button => {
        button.classList.toggle("active", button.dataset.adminView === viewName);
    });

    const titles = {
        dashboard: "Dashboard",
        classTimetable: "Class-wise Timetable",
        teacherTimetable: "Teacher-wise Timetable",
        addLecture: "Add Lecture",
        editLecture: "Edit Lecture",
        deleteLecture: "Delete Lecture",
        subjectAllocation: "Subject Allocation"
    };
    const title = document.getElementById("adminViewTitle");
    if (title) title.textContent = titles[viewName] || "Dashboard";
}

function openAdminAddLecture() {
    resetForm();
    setAdminView("addLecture");
}

function populateAdminViewFilters() {
    const classNames = [...new Set(timetable.map(item => clean(item.class)).filter(Boolean))];
    const teachers = [...new Set(timetable.map(item => clean(item.teacher)).filter(Boolean))];
    const subjects = [...new Set(timetable.map(item => clean(item.subject)).filter(Boolean))];

    const fillSelect = (id, firstLabel, values) => {
        const select = document.getElementById(id);
        if (!select) return;

        const oldValue = select.value;
        select.innerHTML = "";

        const firstOption = document.createElement("option");
        firstOption.value = "";
        firstOption.textContent = firstLabel;
        select.appendChild(firstOption);

        values.forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = value;
            select.appendChild(option);
        });

        select.value = values.includes(oldValue) ? oldValue : "";
    };

    fillSelect("adminTeacherSelect", "All Teachers", teachers);
    fillSelect("adminAllocationClass", "All Classes", classNames);
    fillSelect("adminAllocationSubject", "All Subjects", subjects);
}

function updateAdminDashboardStats() {
    const stats = {
        adminStatLectures: timetable.length,
        adminStatTeachers: new Set(timetable.map(item => clean(item.teacher)).filter(Boolean)).size,
        adminStatClasses: new Set(timetable.map(item => clean(item.class)).filter(Boolean)).size,
        adminStatRooms: allRooms.length
    };

    Object.keys(stats).forEach(id => {
        const element = document.getElementById(id);
        if (element) element.textContent = stats[id];
    });
}

function createAdminScheduleTable(entries) {
    if (entries.length === 0) {
        return "<p class='empty-state'>No timetable entries match these filters.</p>";
    }

    const orderedEntries = entries.slice().sort((first, second) => {
        const dayOrder = days.indexOf(first.day) - days.indexOf(second.day);
        if (dayOrder !== 0) return dayOrder;

        const slotOrder = [...times, ...saturdayTimes];
        return slotOrder.indexOf(first.time) - slotOrder.indexOf(second.time);
    });

    let html =
        "<div class='table-scroll'><table><tr><th>Day</th><th>Time</th><th>Class</th><th>Subject</th><th>Teacher</th><th>Room</th></tr>";

    orderedEntries.forEach(item => {
        html +=
            "<tr><td>" + escapeHTML(item.day) + "</td>" +
            "<td>" + escapeHTML(item.time) + "</td>" +
            "<td>" + escapeHTML(item.class) + "</td>" +
            "<td>" + escapeHTML(item.subject) + "</td>" +
            "<td>" + escapeHTML(item.teacher || "-") + "</td>" +
            "<td>" + escapeHTML(item.room) + "</td></tr>";
    });

    return html + "</table></div>";
}

function renderClassTimetable() {
    const container = document.getElementById("adminClassTimetableData");
    const yearSelect = document.getElementById("adminClassYear");
    const streamSelect = document.getElementById("adminClassStream");
    const daySelect = document.getElementById("adminClassDay");
    if (!container || !yearSelect || !streamSelect || !daySelect) return;

    const selectedYear = yearSelect.value;
    const selectedStream = streamSelect.value;
    const entries = timetable.filter(item => {
        const className = clean(item.class).toUpperCase();
        const yearMatches =
            !selectedYear ||
            className === selectedYear ||
            className.startsWith(selectedYear + " (");
        const streamMatch = className.match(/\((AI|DS)\)/);
        const streamMatches =
            !selectedStream ||
            (streamMatch && streamMatch[1] === selectedStream);

        return yearMatches &&
            streamMatches &&
            (!daySelect.value || clean(item.day) === daySelect.value);
    });
    container.innerHTML = createAdminScheduleTable(entries);
}

function renderTeacherTimetable() {
    const container = document.getElementById("adminTeacherTimetableData");
    const teacherSelect = document.getElementById("adminTeacherSelect");
    const daySelect = document.getElementById("adminTeacherDay");
    if (!container || !teacherSelect || !daySelect) return;

    const entries = timetable.filter(item =>
        (!teacherSelect.value || clean(item.teacher) === teacherSelect.value) &&
        (!daySelect.value || clean(item.day) === daySelect.value)
    );
    container.innerHTML = createAdminScheduleTable(entries);
}

function renderSubjectAllocations() {
    const container = document.getElementById("adminSubjectAllocationData");
    const classSelect = document.getElementById("adminAllocationClass");
    const subjectSelect = document.getElementById("adminAllocationSubject");
    if (!container || !classSelect || !subjectSelect) return;

    const allocationMap = new Map();
    timetable
        .filter(item =>
            (!classSelect.value || clean(item.class) === classSelect.value) &&
            (!subjectSelect.value || clean(item.subject) === subjectSelect.value)
        )
        .forEach(item => {
            const key = [clean(item.class), clean(item.subject), clean(item.teacher)].join("|");
            const allocation = allocationMap.get(key) || {
                class: item.class,
                subject: item.subject,
                teacher: item.teacher,
                lectures: 0
            };
            allocation.lectures += 1;
            allocationMap.set(key, allocation);
        });

    const allocations = [...allocationMap.values()].sort((first, second) =>
        first.class.localeCompare(second.class) || first.subject.localeCompare(second.subject)
    );

    if (allocations.length === 0) {
        container.innerHTML = "<p class='empty-state'>No subject allocations match these filters.</p>";
        return;
    }

    let html =
        "<div class='table-scroll'><table><tr><th>Class</th><th>Subject</th><th>Assigned Teacher</th><th>Scheduled Lectures</th></tr>";
    allocations.forEach(item => {
        html +=
            "<tr><td>" + escapeHTML(item.class) + "</td>" +
            "<td>" + escapeHTML(item.subject) + "</td>" +
            "<td>" + escapeHTML(item.teacher || "-") + "</td>" +
            "<td>" + item.lectures + "</td></tr>";
    });
    container.innerHTML = html + "</table></div>";
}

function loadAdminAvailabilityRooms() {
const select =
    document.getElementById("adminCheckRoom");

if (!select) return;

const selectedRoom = clean(select.value);
select.innerHTML = "<option value=''>All Rooms</option>";

allRooms.forEach(room => {
    const option = document.createElement("option");
    option.value = room;
    option.textContent = room;
    select.appendChild(option);
});

select.value = allRooms.includes(selectedRoom)
    ? selectedRoom
    : "";
}

/* =========================
ADMIN TABLE
========================= */

function loadAdminTable() {

const editBox = document.getElementById("adminEditData");
const deleteBox = document.getElementById("adminDeleteData");
if (!editBox && !deleteBox) return;

const filterTeacherElement =
    document.getElementById("filterTeacher");

const filterYearElement =
    document.getElementById("filterYear");

const filterDayElement =
    document.getElementById("filterDay");

const filterYear =
    filterYearElement
        ? clean(filterYearElement.value)
        : "";

const filterTeacher =
    filterTeacherElement
        ? clean(filterTeacherElement.value)
        : "";

const filterDay =
    filterDayElement
        ? clean(filterDayElement.value)
        : "";

const filtered =
    timetable
        .map((item, index) => ({ item, index }))
        .filter(({ item }) => {

        const className = clean(item.class);
        const matchY =
            !filterYear ||
            className === filterYear ||
            className.startsWith(filterYear + " (");

        const matchT =
            filterTeacher
                ? clean(item.teacher) === filterTeacher
                : true;

        const matchD =
            filterDay
                ? clean(item.day) === filterDay
                : true;

        return matchY && matchT && matchD;
    });

const renderManagementTable = (entries, action) => {
    if (entries.length === 0) {
        return "<p class='empty-state'>No lectures found.</p>";
    }

    let html =
    "<div class='table-scroll'>" +
    "<table>" +
    "<tr>" +
    "<th>Day</th>" +
    "<th>Class</th>" +
    "<th>Time</th>" +
    "<th>Subject</th>" +
    "<th>Teacher</th>" +
    "<th>Room</th>" +
    "<th>" + (action === "edit" ? "Edit" : "Delete") + "</th>" +
    "</tr>";

    entries.forEach(({ item, index }) => {
        const actionButton = action === "edit"
            ? "<button class='edit' onclick='editLecture(" + index + ")'>Edit</button>"
            : "<button class='delete' onclick='deleteLecture(" + index + ")'>Delete</button>";

        html +=
            "<tr>" +
            "<td>" + escapeHTML(item.day) + "</td>" +
            "<td>" + escapeHTML(item.class) + "</td>" +
            "<td>" + escapeHTML(item.time) + "</td>" +
            "<td>" + escapeHTML(item.subject) + "</td>" +
            "<td>" + escapeHTML(item.teacher || "-") + "</td>" +
            "<td>" + escapeHTML(item.room) + "</td>" +
            "<td>" + actionButton + "</td>" +
            "</tr>";
    });

    return html + "</table></div>";
};

if (editBox) editBox.innerHTML = renderManagementTable(filtered, "edit");
if (deleteBox) deleteBox.innerHTML = renderManagementTable(
    timetable.map((item, index) => ({ item, index })),
    "delete"
);

}

/* =========================
OVERLAP CHECK
========================= */

function checkOverlap(
day,
time,
teacher,
room,
cls,
ignoreIndex = -1
) {

const conflicts = [];

timetable.forEach((item, idx) => {

    if (idx === ignoreIndex) return;

    if (
        clean(item.day) === clean(day) &&
        clean(item.time) === clean(time)
    ) {

        if (
            teacher &&
            item.teacher &&
            clean(item.teacher).toLowerCase() ===
            clean(teacher).toLowerCase()
        ) {

            conflicts.push(
                "Teacher '" +
                teacher +
                "' is already assigned to class '" +
                item.class +
                "' (" +
                item.subject +
                ") at this time slot."
            );
        }

        if (
            clean(item.room) === clean(room)
        ) {

            conflicts.push(
                "Room '" +
                room +
                "' is already occupied by class '" +
                item.class +
                "' (" +
                item.subject +
                ") at this time slot."
            );
        }

        if (
            clean(item.class) === clean(cls)
        ) {

            conflicts.push(
                "Class '" +
                cls +
                "' already has a lecture (" +
                item.subject +
                ") assigned at this time slot."
            );
        }
    }
});

return conflicts;

}

/* =========================
SAVE LECTURE
========================= */

async function saveLecture() {

const day =
    clean(document.getElementById("aDay").value);

const cls =
    clean(document.getElementById("aClass").value);

const time =
    clean(document.getElementById("aTime").value);

const subject =
    clean(document.getElementById("aSubject").value);

const teacher =
    clean(document.getElementById("aTeacher").value);

const room =
    clean(document.getElementById("aRoom").value);

const editIndex =
    parseInt(
        document.getElementById("editIndex").value
    );
const existingLecture =
    Number.isInteger(editIndex) && editIndex >= 0
        ? timetable[editIndex]
        : null;

const alertContainer =
    document.getElementById("adminAlertContainer");

alertContainer.innerHTML = "";

if (!subject) {
    alert("Please enter subject name.");
    return;
}

if (editIndex >= 0 && !existingLecture) {
    alert("The lecture being edited could not be found. Please select it again.");
    resetForm();
    return;
}

const assignedTeacher = existingLecture
    ? clean(existingLecture.teacher)
    : teacher;

const conflicts =
    checkOverlap(
        day,
        time,
        assignedTeacher,
        room,
        cls,
        editIndex
    );

if (conflicts.length > 0) {

    let alertHTML =
        "<div class='alert-box'>" +
        "<b>⚠️ Lecture Overlap Detected! Action Blocked:</b>" +
        "<ul>";

    conflicts.forEach(err => {
        alertHTML += "<li>" + err + "</li>";
    });

    alertHTML += "</ul></div>";

    alertContainer.innerHTML =
        alertHTML;

    return;
}

try {

    const obj = {
        day: day,
        class: cls,
        time: time,
        subject: subject,
        teacher: assignedTeacher,
        room: room
    };

    if (existingLecture) {

        obj.action = "update";
        obj.id = existingLecture.id;

    } else {

        obj.action = "add";
    }

    await sendToAPI(obj);

    await loadDatabase();

    resetForm();

    loadAdmin();

    alert("Timetable updated successfully.");

} catch (error) {

    console.error("Save Error:", error);

    alert(
        "Error saving timetable: " +
        error.message
    );
}

}

/* =========================
EDIT LECTURE
========================= */

function editLecture(index) {

const item = timetable[index];

if (!item) return;

const setSelectValue = (id, value) => {
    const select = document.getElementById(id);
    if (!select) return;

    const selectedValue = clean(value);
    if (
        selectedValue &&
        !Array.from(select.options).some(option => option.value === selectedValue)
    ) {
        const option = document.createElement("option");
        option.value = selectedValue;
        option.textContent = selectedValue;
        select.appendChild(option);
    }

    select.value = selectedValue;
};

setSelectValue("aDay", item.day);
setSelectValue("aClass", item.class);
setSelectValue("aTime", item.time);
setSelectValue("aRoom", item.room);

const subject = document.getElementById("aSubject");
const teacher = document.getElementById("aTeacher");
const editIndexInput = document.getElementById("editIndex");
const alertContainer = document.getElementById("adminAlertContainer");

if (subject) subject.value = item.subject;
if (teacher) {
    teacher.value = item.teacher || "";
    teacher.readOnly = true;
    teacher.title = "Teacher assignment is fixed for this subject.";
}
if (editIndexInput) editIndexInput.value = index;
if (alertContainer) alertContainer.innerHTML = "";

const formTitle = document.getElementById("adminLectureFormTitle");
if (formTitle) formTitle.textContent = "Edit Lecture";

const saveButton =
    document.querySelector("#adminPanel .admin-box button[onclick='saveLecture()']");
if (saveButton) saveButton.textContent = "Update Lecture";

setAdminView("addLecture");

window.scrollTo({
    top: 0,
    behavior: "smooth"
});

}

/* =========================
RESET FORM
========================= */

function resetForm() {

const subject =
    document.getElementById("aSubject");

const teacher =
    document.getElementById("aTeacher");

const editIndex =
    document.getElementById("editIndex");

const alertContainer =
    document.getElementById("adminAlertContainer");

if (subject) subject.value = "";
if (teacher) {
    teacher.value = "";
    teacher.readOnly = false;
    teacher.title = "";
}
if (editIndex) editIndex.value = "-1";

if (alertContainer) {
    alertContainer.innerHTML = "";
}

const formTitle = document.getElementById("adminLectureFormTitle");
if (formTitle) formTitle.textContent = "Add Lecture";

const saveButton =
    document.querySelector("#adminPanel .admin-box button[onclick='saveLecture()']");
if (saveButton) saveButton.textContent = "Save Lecture";

}

/* =========================
DELETE LECTURE
========================= */

async function deleteLecture(index) {

if (!confirm("Delete this lecture?")) {
    return;
}

try {

    const lecture =
        timetable[index];

    if (!lecture || !lecture.id) {
        throw new Error("Lecture ID not found");
    }

    await sendToAPI({
        action: "delete",
        id: lecture.id
    });

    await loadDatabase();

    loadAdmin();

    alert("Lecture deleted successfully.");

} catch (error) {

    console.error("Delete Error:", error);

    alert(
        "Error deleting lecture: " +
        error.message
    );
}

}

/* =========================
RESET TIMETABLE
========================= */

function resetTimetable() {

alert(
    "Google Sheet is now the main database. " +
    "Reset feature is disabled to prevent accidental data loss."
);

}

/* =========================
SET TODAY
========================= */

function setToday(id) {

const d = new Date();

const yyyy =
    d.getFullYear();

const mm =
    String(d.getMonth() + 1)
        .padStart(2, "0");

const dd =
    String(d.getDate())
        .padStart(2, "0");

const el =
    document.getElementById(id);

if (el) {

    el.value =
        yyyy +
        "-" +
        mm +
        "-" +
        dd;
}

}

/* =========================
PAGE LOAD
========================= */

window.onload = async function () {

await loadDatabase();

};
