import { CV, createEmptyCv, uid } from '../src/shared/model';

/** Volledig FICTIEVE testdata ("Voorbeeld Persoon"); alleen gebruikt in tests, niet in de app zelf. */
export function demoCv(): CV {
  const cv = createEmptyCv('Testcv');
  cv.personal = {
    fullName: 'Voorbeeld Persoon', title: 'Stagiair Software Engineer', email: 'voorbeeld@example.com',
    phone: '06 12345678', location: 'Amsterdam', birthDate: '1 januari 2000', linkedin: 'linkedin.com/in/voorbeeld', github: 'github.com/voorbeeld', website: ''
  };
  for (const s of cv.sections) {
    if (s.type === 'profile') s.text = 'Testprofiel: student met interesse in softwareontwikkeling. Dit is voorbeeldtekst voor het controleren van de opmaak.';
    if (s.type === 'projects') s.items = [
      { id: uid(), name: 'Testproject A', tech: 'TypeScript, React', period: '2024', description: '- Eerste punt van het project\n- Tweede punt van het project', github: 'github.com/voorbeeld/a' },
      { id: uid(), name: 'Testproject B', tech: 'Python', period: '2023', description: 'Korte omschrijving van het tweede testproject.', github: '' }
    ];
    if (s.type === 'education') s.items = [{ id: uid(), degree: 'Testopleiding Informatica', school: 'Testhogeschool', start: '2022', end: 'heden', description: '' }];
    if (s.type === 'experience') s.items = [{ id: uid(), role: 'Testfunctie', company: 'Testbedrijf', location: 'Utrecht', start: '2021', end: '2022', description: '- Testtaak één\n- Testtaak twee' }];
    if (s.type === 'skills') s.groups = [
      { id: uid(), name: 'Programmeren', skills: ['TypeScript', 'Python', 'SQL'], level: 0 },
      { id: uid(), name: 'Tools', skills: ['Git', 'Docker'], level: 0 }
    ];
    if (s.type === 'languages') s.items = [{ id: uid(), name: 'Nederlands', level: 'Moedertaal', rating: 5 }, { id: uid(), name: 'Engels', level: 'Vloeiend', rating: 4 }];
  }
  return cv;
}
