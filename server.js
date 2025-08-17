require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const GITHUB_PAT = process.env.GITHUB_PAT;
const GITHUB_REPO = 'dg143143/1';
const USERS_FILE_PATH = 'users.json';

// --- GitHub API Functions (now on the server) ---

async function readFromGitHub() {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${USERS_FILE_PATH}`;
  const headers = {
    'Authorization': `token ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github.v3+json'
  };
  try {
    const response = await axios.get(url, { headers });
    const content = Buffer.from(response.data.content, 'base64').toString('utf-8');
    return {
      success: true,
      users: JSON.parse(content),
      sha: response.data.sha
    };
  } catch (error) {
    console.error('Error reading from GitHub:', error.response ? error.response.data : error.message);
    return { success: false, error: 'Could not read from GitHub.' };
  }
}

async function writeToGitHub(users, sha, commitMessage) {
  const url = `https://api.github.com/repos/${GITHUB_REPO}/contents/${USERS_FILE_PATH}`;
  const headers = {
    'Authorization': `token ${GITHUB_PAT}`,
    'Accept': 'application/vnd.github.v3+json'
  };
  const content = Buffer.from(JSON.stringify(users, null, 2)).toString('base64');
  const data = {
    message: commitMessage,
    content: content,
    sha: sha
  };
  try {
    const response = await axios.put(url, data, { headers });
    return { success: true, sha: response.data.content.sha };
  } catch (error) {
    console.error('Error writing to GitHub:', error.response ? error.response.data : error.message);
    return { success: false, error: 'Could not write to GitHub.' };
  }
}

// --- API Endpoints ---

app.get('/api/users', async (req, res) => {
  if (!GITHUB_PAT) {
    return res.status(500).json({ success: false, error: 'GitHub PAT not configured on server.' });
  }
  const result = await readFromGitHub();
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

app.post('/api/users', async (req, res) => {
  if (!GITHUB_PAT) {
    return res.status(500).json({ success: false, error: 'GitHub PAT not configured on server.' });
  }
  const { users, sha, commitMessage } = req.body;
  if (!users || !sha || !commitMessage) {
    return res.status(400).json({ success: false, error: 'Invalid request body.' });
  }
  const result = await writeToGitHub(users, sha, commitMessage);
  if (result.success) {
    res.json(result);
  } else {
    res.status(500).json(result);
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
