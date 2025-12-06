import './style.css'

interface Session {
  id: number;
  project_id: number;
  start_time: string;
  end_time?: string;
  note: string;
}

interface Project {
  id: number;
  name: string;
  description: string;
  status: string;
  sessions: Session[];
}

let currentProjectId: number | null = null;

async function loadProjects() {
  const res = await fetch('/api/projects');
  const projects: Project[] = await res.json();
  const container = document.getElementById('projects-list');
  if (container) {
    container.innerHTML = projects.map(p => `
            <a href="#" class="card" data-id="${p.id}">
                <div style="display: flex; justify-content: space-between; align-items: start;">
                    <h3>${p.name}</h3>
                    <span class="status-badge status-${p.status}">${p.status}</span>
                </div>
                <p>${p.description}</p>
            </a>
        `).join('');

    // Add event listeners
    container.querySelectorAll('.card').forEach(card => {
      card.addEventListener('click', (e) => {
        e.preventDefault();
        const id = (card as HTMLElement).dataset.id;
        if (id) viewProject(parseInt(id));
      });
    });
  }
}

async function viewProject(id: number) {
  currentProjectId = id;
  const projectsView = document.getElementById('projects-view');
  const projectDetailView = document.getElementById('project-detail-view');
  const newSessionForm = document.getElementById('new-session-form');

  if (projectsView) projectsView.style.display = 'none';
  if (projectDetailView) projectDetailView.style.display = 'block';
  if (newSessionForm) newSessionForm.style.display = 'none';

  const res = await fetch(`/api/projects/${id}`);
  const project: Project = await res.json();

  const nameEl = document.getElementById('project-name');
  const descEl = document.getElementById('project-description');

  if (nameEl) nameEl.textContent = project.name;
  if (descEl) descEl.textContent = project.description;

  const sessionsContainer = document.getElementById('sessions-list');
  if (sessionsContainer) {
    if (project.sessions && project.sessions.length > 0) {
      sessionsContainer.innerHTML = project.sessions.map(s => `
                <div class="card">
                    <h3>${new Date(s.start_time).toLocaleString()}</h3>
                    <p>${s.note || 'No notes'}</p>
                    <p>Duration: ${s.end_time ? calculateDuration(s.start_time, s.end_time) : 'Running...'}</p>
                </div>
            `).join('');
    } else {
      sessionsContainer.innerHTML = '<p>No sessions found.</p>';
    }
  }
}

function calculateDuration(start: string, end: string): string {
  const diff = new Date(end).getTime() - new Date(start).getTime();
  const minutes = Math.floor(diff / 60000);
  return `${minutes} mins`;
}

function showProjects() {
  const projectsView = document.getElementById('projects-view');
  const projectDetailView = document.getElementById('project-detail-view');

  if (projectsView) projectsView.style.display = 'block';
  if (projectDetailView) projectDetailView.style.display = 'none';
  currentProjectId = null;
  loadProjects();
}

function toggleSessionForm() {
  const form = document.getElementById('new-session-form');
  if (form) {
    form.style.display = form.style.display === 'none' ? 'block' : 'none';
    if (form.style.display === 'block') {
      const input = document.getElementById('session-note');
      if (input) input.focus();
    }
  }
}

async function confirmStartSession() {
  if (!currentProjectId) return;
  const noteInput = document.getElementById('session-note') as HTMLInputElement;
  const note = noteInput.value;

  await fetch('/api/sessions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ project_id: currentProjectId, note: note })
  });

  noteInput.value = ''; // Reset
  toggleSessionForm();
  viewProject(currentProjectId); // Reload
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
  loadProjects();

  const backBtn = document.querySelector('#project-detail-view .btn-secondary');
  if (backBtn) backBtn.addEventListener('click', showProjects);

  // Better selector needed or add IDs
  document.getElementById('start-session-btn')?.addEventListener('click', toggleSessionForm);
  document.getElementById('cancel-session-btn')?.addEventListener('click', toggleSessionForm);
  document.getElementById('confirm-session-btn')?.addEventListener('click', confirmStartSession);

  // Nav items
  document.querySelectorAll('.nav-item').forEach(nav => {
    if (nav.textContent === 'Projects') {
      nav.addEventListener('click', (e) => {
        e.preventDefault();
        showProjects();
      });
    }
  });
});
