const STORAGE_KEY = 'studywell-dashboard-v1';
const seed = {
  courses: [],
  assignments: []
};
let state = loadState();
const $ = (selector) => document.querySelector(selector);
const courseDialog = $('#courseDialog');
const assignmentDialog = $('#assignmentDialog');

function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) || structuredClone(seed); }
  catch { return structuredClone(seed); }
}
function saveState(message = 'All changes saved locally') {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  $('#saveStatus').textContent = message;
  window.setTimeout(() => { $('#saveStatus').textContent = 'All changes saved locally'; }, 1800);
}
function uid(prefix) { return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2)}`; }
function showToast(message) { const toast = $('#toast'); toast.textContent = message; toast.classList.add('show'); window.clearTimeout(showToast.timer); showToast.timer = window.setTimeout(() => toast.classList.remove('show'), 2400); }
function formatDate(value) { const date = new Date(`${value}T12:00:00`); return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }); }
function courseById(id) { return state.courses.find((course) => course.id === id); }
function escapeHtml(value) { return String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char])); }

function render() {
  renderCourses(); renderAssignments(); renderCourseOptions(); updateSummary();
}
function renderCourses() {
  const list = $('#courseList');
  if (!state.courses.length) { list.innerHTML = '<div class="empty-state">Add your first course to get started.</div>'; return; }
  list.innerHTML = state.courses.map((course) => `<article class="course-card"><div class="course-title"><span class="course-dot ${course.accent}"></span><div><div class="course-name">${escapeHtml(course.name)}</div><div class="course-code">${escapeHtml(course.code)}</div></div></div><div><div class="progress-track"><div class="progress-fill" style="width:${course.grade}%"></div></div><div class="course-grade">${course.grade}% <small>current grade</small></div></div><div class="course-actions"><button class="course-menu" type="button" data-edit-course="${course.id}" aria-label="Edit ${escapeHtml(course.name)}">✎</button><button class="course-menu" type="button" data-delete-course="${course.id}" aria-label="Delete ${escapeHtml(course.name)}">×</button></div></article>`).join('');
}
function renderAssignments() {
  const filter = $('#courseFilter').value; const list = $('#assignmentList');
  const assignments = state.assignments.filter((assignment) => filter === 'all' || assignment.courseId === filter);
  $('#emptyAssignments').hidden = assignments.length > 0;
  list.innerHTML = assignments.map((assignment) => { const course = courseById(assignment.courseId); return `<tr><td>${escapeHtml(assignment.name)}</td><td class="assignment-course">${course ? escapeHtml(course.code) : 'Unassigned'}</td><td class="date ${assignment.priority === 'high' && assignment.status !== 'done' ? 'soon' : ''}">${formatDate(assignment.due)}</td><td><span class="pill ${assignment.priority}">${assignment.priority}</span></td><td><select class="status-select ${assignment.status}" data-status-id="${assignment.id}" aria-label="Change status for ${escapeHtml(assignment.name)}"><option value="todo" ${assignment.status === 'todo' ? 'selected' : ''}>To do</option><option value="in-progress" ${assignment.status === 'in-progress' ? 'selected' : ''}>In progress</option><option value="done" ${assignment.status === 'done' ? 'selected' : ''}>Complete</option></select></td><td class="row-actions"><button class="icon-button" type="button" data-edit-assignment="${assignment.id}" aria-label="Edit ${escapeHtml(assignment.name)}">✎</button><button class="icon-button" type="button" data-delete-assignment="${assignment.id}" aria-label="Delete ${escapeHtml(assignment.name)}">×</button></td></tr>`; }).join('');
}
function renderCourseOptions() { const options = state.courses.map((course) => `<option value="${course.id}">${escapeHtml(course.code)} · ${escapeHtml(course.name)}</option>`).join(''); $('#courseFilter').innerHTML = '<option value="all">All courses</option>' + options; if (!state.courses.length) $('#assignmentCourse').innerHTML = '<option value="">Add a course first</option>'; else $('#assignmentCourse').innerHTML = options; }
function updateSummary() { const active = state.assignments.filter((assignment) => assignment.status !== 'done'); const average = state.courses.length ? Math.round(state.courses.reduce((sum, course) => sum + Number(course.grade), 0) / state.courses.length) : 0; $('#gpaValue').textContent = state.courses.length ? (average / 25).toFixed(2) : '0.00'; $('#dueValue').textContent = String(active.length).padStart(2, '0'); $('#urgentValue').textContent = String(active.filter((assignment) => assignment.priority === 'high').length); const next = active[0]; $('#nextFocus').textContent = next ? next.name : 'Plan your next win'; }

function openCourse(course) { $('#courseDialogTitle').textContent = course ? 'Edit course' : 'Add a course'; $('#courseId').value = course?.id || ''; $('#courseName').value = course?.name || ''; $('#courseCode').value = course?.code || ''; $('#courseGrade').value = course?.grade ?? 90; $('#courseAccent').value = course?.accent || 'orange'; courseDialog.showModal(); $('#courseName').focus(); }
function openAssignment(assignment) { $('#assignmentDialogTitle').textContent = assignment ? 'Edit assignment' : 'Add an assignment'; $('#assignmentId').value = assignment?.id || ''; $('#assignmentName').value = assignment?.name || ''; $('#assignmentCourse').value = assignment?.courseId || state.courses[0]?.id || ''; $('#assignmentDue').value = assignment?.due || new Date().toISOString().slice(0, 10); $('#assignmentPriority').value = assignment?.priority || 'medium'; $('#assignmentStatus').value = assignment?.status || 'todo'; assignmentDialog.showModal(); $('#assignmentName').focus(); }

$('#addCourseButton').addEventListener('click', () => openCourse());
$('#quickAddButton').addEventListener('click', () => openAssignment());
$('#addAssignmentButton').addEventListener('click', () => state.courses.length ? openAssignment() : (openCourse(), showToast('Add a course before planning an assignment')));
$('#courseFilter').addEventListener('change', renderAssignments);
$('#courseList').addEventListener('click', (event) => { const button = event.target.closest('[data-edit-course]'); const remove = event.target.closest('[data-delete-course]'); if (button) openCourse(courseById(button.dataset.editCourse)); if (remove) { const course = courseById(remove.dataset.deleteCourse); if (!course || !window.confirm(`Delete ${course.name}? Its assignments will also be removed.`)) return; state.courses = state.courses.filter((item) => item.id !== course.id); state.assignments = state.assignments.filter((item) => item.courseId !== course.id); saveState('Course deleted'); render(); showToast('Course deleted'); } });
$('#assignmentList').addEventListener('click', (event) => { const edit = event.target.closest('[data-edit-assignment]'); const remove = event.target.closest('[data-delete-assignment]'); if (edit) openAssignment(state.assignments.find((assignment) => assignment.id === edit.dataset.editAssignment)); if (remove) { state.assignments = state.assignments.filter((assignment) => assignment.id !== remove.dataset.deleteAssignment); saveState('Assignment deleted'); render(); showToast('Assignment deleted'); } });
$('#assignmentList').addEventListener('change', (event) => { const select = event.target.closest('[data-status-id]'); if (select) { const assignment = state.assignments.find((item) => item.id === select.dataset.statusId); assignment.status = select.value; saveState('Status updated'); render(); showToast('Status updated'); } });
$('#courseForm').addEventListener('submit', (event) => { event.preventDefault(); const id = $('#courseId').value; const course = { id: id || uid('course'), name: $('#courseName').value.trim(), code: $('#courseCode').value.trim(), grade: Number($('#courseGrade').value), accent: $('#courseAccent').value }; if (id) state.courses = state.courses.map((item) => item.id === id ? course : item); else state.courses.push(course); saveState(id ? 'Course updated' : 'Course added'); courseDialog.close(); render(); showToast(id ? 'Course updated' : 'Course added'); });
$('#assignmentForm').addEventListener('submit', (event) => { event.preventDefault(); const id = $('#assignmentId').value; const assignment = { id: id || uid('assignment'), name: $('#assignmentName').value.trim(), courseId: $('#assignmentCourse').value, due: $('#assignmentDue').value, priority: $('#assignmentPriority').value, status: $('#assignmentStatus').value }; if (id) state.assignments = state.assignments.map((item) => item.id === id ? assignment : item); else state.assignments.push(assignment); saveState(id ? 'Assignment updated' : 'Assignment added'); assignmentDialog.close(); render(); showToast(id ? 'Assignment updated' : 'Assignment added'); });

render();
