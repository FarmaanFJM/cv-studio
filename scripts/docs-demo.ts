import { CV, createEmptyCv, uid } from '../src/shared/model';

/** Fictional example CV used for the README screenshots. No real person, employer or contact detail. */
export function docsDemoCv(): CV {
  const cv = createEmptyCv('Software developer CV');
  cv.personal = {
    fullName: 'Alex Morgan', title: 'Junior Full-Stack Developer', email: 'alex.morgan@example.com', phone: '+1 555 0100',
    location: 'Utrecht, NL', birthDate: '', linkedin: 'linkedin.com/in/alex-morgan-demo', github: 'github.com/alexmorgan-demo', website: ''
  };
  cv.style.fontSize = 9.5;
  cv.style.sectionGap = 4.6;
  cv.style.itemGap = 2;
  cv.style.margin = 11;
  const titles: Record<string, string> = { personal: 'Contact', profile: 'Profile', projects: 'Projects', education: 'Education', experience: 'Work experience', skills: 'Skills', languages: 'Languages' };
  for (const s of cv.sections) {
    if (titles[s.type]) s.title = titles[s.type];
    if (s.type === 'profile') s.text = 'Computer science student who enjoys building small, useful web apps and games. Comfortable with TypeScript, React and Node.js, and keen to learn from an experienced team during an internship.';
    if (s.type === 'projects') {
      s.techDisplay = 'chips';
      s.items = [
        { id: uid(), name: 'Habit Tracker', tech: 'TypeScript, React, Firebase', period: '2025', description: '- Offline-first web app with daily streaks and charts', github: 'github.com/alexmorgan-demo/habit-tracker' },
        { id: uid(), name: 'Campus Marketplace API', tech: 'Node.js, MongoDB, Docker', period: '2024', description: '- REST API with authentication, containerized with Docker', github: '' },
        { id: uid(), name: 'Dungeon Runner', tech: 'Godot', period: '2024', description: 'Small 2D game made in a weekend game jam.', github: '' }
      ];
    }
    if (s.type === 'education') s.items = [{ id: uid(), degree: 'BSc Computer Science', school: 'Riverside University of Applied Sciences', start: '2023', end: 'present', description: 'Focus on web development and software engineering.' }];
    if (s.type === 'experience') s.items = [{ id: uid(), role: 'IT Support Assistant (part-time)', company: 'Northwind Labs', location: 'Utrecht', start: '2023', end: '2024', description: '- Helped colleagues with laptops, accounts and software\n- Wrote small scripts to automate recurring tasks' }];
    if (s.type === 'skills') {
      s.mode = 'grouped';
      s.display = 'chips';
      s.groups = [
        { id: uid(), name: 'Languages', skills: ['TypeScript', 'JavaScript', 'Python', 'SQL', 'HTML'], level: 0 },
        { id: uid(), name: 'Frameworks', skills: ['React', 'Node.js', 'Vue'], level: 0 },
        { id: uid(), name: 'Tools', skills: ['Git', 'GitHub', 'Docker', 'Linux'], level: 0 }
      ];
    }
    if (s.type === 'languages') {
      s.display = 'dots';
      s.items = [{ id: uid(), name: 'English', level: 'Fluent', rating: 5 }, { id: uid(), name: 'Dutch', level: 'Native', rating: 5 }];
    }
  }
  cv.sections.push({
    id: uid(), type: 'custom', title: 'Links', visible: true, zone: 'supplementary', mode: 'keyvalue', techOverride: false, techShow: true, techColor: 'auto', text: '',
    items: [{ id: uid(), text: 'Portfolio', value: 'alexmorgan.example.com' }]
  });
  return cv;
}
