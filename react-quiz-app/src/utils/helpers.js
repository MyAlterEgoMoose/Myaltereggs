// Utility functions for the quiz app

export function generateId() {
  return Date.now() + '-' + Math.random().toString(36).substr(2, 8);
}

export function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>]/g, m => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' }[m]));
}

export function toRoman(num) {
  if (num <= 0 || num > 3999) return num.toString();
  const roman = [
    { value: 1000, symbol: 'M' }, { value: 900, symbol: 'CM' },
    { value: 500, symbol: 'D' }, { value: 400, symbol: 'CD' },
    { value: 100, symbol: 'C' }, { value: 90, symbol: 'XC' },
    { value: 50, symbol: 'L' }, { value: 40, symbol: 'XL' },
    { value: 10, symbol: 'X' }, { value: 9, symbol: 'IX' },
    { value: 5, symbol: 'V' }, { value: 4, symbol: 'IV' },
    { value: 1, symbol: 'I' }
  ];
  let result = '';
  for (let i = 0; i < roman.length; i++) {
    while (num >= roman[i].value) {
      result += roman[i].symbol;
      num -= roman[i].value;
    }
  }
  return result;
}

export function isAnswerCorrect(q, ans) {
  if (q.type === 'open') {
    let u = (ans || '').trim();
    if (!u) return false;
    let c = q.correctAnswers || [];
    let cs = q.caseSensitive || false;
    return c.some(x => cs ? u === x : u.toLowerCase() === x.toLowerCase());
  } else if (q.type === 'slider') {
    let userVal = parseInt(ans);
    return !isNaN(userVal) && userVal >= q.sliderMin && userVal <= q.sliderMax;
  } else {
    let sel = ans || [];
    let ci = q.options.reduce((a, o, i) => {
      if (o.isCorrect) a.push(i);
      return a;
    }, []);
    if (q.type === 'single') {
      return sel.length === 1 && ci.length === 1 && sel[0] === ci[0];
    }
    return sel.length === ci.length && sel.every(v => ci.includes(v)) && ci.every(c => sel.includes(c));
  }
}

export function shuffleArray(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export async function uploadImageToGitHub(file, config) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const base64Content = e.target.result.split(',')[1];
        const fileName = 'images/' + Date.now() + '_' + file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const apiUrl = `https://api.github.com/repos/${config.owner}/${config.repo}/contents/${fileName}`;

        const response = await fetch(apiUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `token ${config.token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            message: 'Upload image via quiz app',
            content: base64Content,
            branch: config.branch
          })
        });

        if (response.ok) {
          const data = await response.json();
          const imageUrl = `https://raw.githubusercontent.com/${config.owner}/${config.repo}/${config.branch}/${fileName}`;
          resolve(imageUrl);
        } else {
          const err = await response.json();
          reject(new Error(err.message || 'Upload failed'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsDataURL(file);
  });
}
