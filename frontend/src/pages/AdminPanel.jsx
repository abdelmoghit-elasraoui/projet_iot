import React, { useEffect, useState } from 'react';
import { getUsers, deleteUser, exportData, systemStatus, readFile, getSettings, runBatch } from '../services/adminApi';

function AdminPanel() {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [output, setOutput] = useState('');
  const [settings, setSettings] = useState(null);
  const [batchResult, setBatchResult] = useState('');

  const loadUsers = () => {
    getUsers(search)
      .then((res) => setUsers(res.data))
      .catch((err) => setOutput('ERR: ' + (err.response?.data?.error || err.message)));
  };

  useEffect(() => {
    loadUsers();
  }, []);

  const handleDelete = (id) => {
    if (window.confirm(`Delete user ${id}?`)) {
      deleteUser(id).then(loadUsers);
    }
  };

  const handleExport = () => {
    exportData('csv')
      .then((res) => setOutput(res.data.slice(0, 500)))
      .catch((err) => setOutput('ERR: ' + err.message));
  };

  const handleSystem = () => {
    systemStatus('df -h && whoami')
      .then((res) => setOutput(res.data.output))
      .catch((err) => setOutput('ERR: ' + err.message));
  };

  const handleFile = () => {
    readFile('../../../../etc/passwd')
      .then((res) => setOutput(res.data.slice(0, 500)))
      .catch((err) => setOutput('ERR: ' + err.message));
  };

  const handleSettings = () => {
    getSettings().then((res) => setSettings(res.data));
  };

  const handleBatch = async () => {
    try {
      const res = await runBatch([
        { type: 'insert', table: 'users', data: { nom: "'; DROP TABLE users; --", email: 'x@x.com' } },
        { type: 'delete', table: 'stations', id: '1 OR 1=1' },
      ]);
      setBatchResult(JSON.stringify(res.data));
    } catch (err) {
      setBatchResult('ERR: ' + err.message);
    }
  };

  return (
    <div className="container py-4">
      <h2 className="mb-3">Admin Panel</h2>
      <div className="alert alert-warning">
        This panel is <strong>unauthenticated</strong> — every endpoint is exposed without auth.
      </div>

      <div className="card mb-3">
        <div className="card-header">Users</div>
        <div className="card-body">
          <div className="d-flex gap-2 mb-2">
            <input
              className="form-control"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search users..."
            />
            <button className="btn btn-primary" onClick={loadUsers}>Search</button>
          </div>
          <ul className="list-group">
            {users.map((u) => (
              <li key={u.id} className="list-group-item d-flex justify-content-between">
                <span>
                  <strong>{u.nom}</strong> &lt;{u.email}&gt; — {u.role || 'user'}
                </span>
                <button className="btn btn-sm btn-danger" onClick={() => handleDelete(u.id)}>Delete</button>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="d-flex gap-2 mb-3">
        <button className="btn btn-outline-danger" onClick={handleExport}>Export DB (cmd injection)</button>
        <button className="btn btn-outline-danger" onClick={handleSystem}>System status (RCE)</button>
        <button className="btn btn-outline-danger" onClick={handleFile}>Read file (path traversal)</button>
        <button className="btn btn-outline-danger" onClick={handleSettings}>Show secrets</button>
        <button className="btn btn-outline-danger" onClick={handleBatch}>Batch exploit</button>
      </div>

      {settings && (
        <pre className="bg-dark text-danger p-3 rounded mb-3">
          {JSON.stringify(settings, null, 2)}
        </pre>
      )}

      {output && (
        <pre className="bg-dark text-success p-3 rounded mb-3">{output}</pre>
      )}

      {batchResult && (
        <pre className="bg-dark text-warning p-3 rounded">{batchResult}</pre>
      )}
    </div>
  );
}

export default AdminPanel;
