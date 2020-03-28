const { context } = require('@actions/github');
const signale = require('signale');

const pullRequests = async ({
    octokit,
    owner = context.repo.owner,
    repo = context.repo.repo,
    pull_number = context.payload.pull_request.number,
    base = context.payload.pull_request.base.ref
  }) => {
  signale.debug({prefix: '[pr]', message: {owner, repo, pull_number, base}});

  const files = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number,
    per_page: 100,
  });

  const changedFiles = files.data.map(f => f.filename);

  const prAllList = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    base,
    per_page: 100,
  });

  const openedPrs = prAllList.data.filter(d => d.number !== pull_number);
  const promises = openedPrs.map(o => octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: o.number,
    per_page: 100,
  }).then(r => ({
    number: o.number,
    files: r.data.map(f => f.filename),
    conflicts: [],
  })));

  const allFiles = await Promise.all(promises);

  const result = allFiles.filter(d => {
    let isConflict = false;
    d.files.forEach(f => {
      const has = changedFiles.includes(f);
      if (has) {
        isConflict = true;
        d.conflicts.push(f);
      }
      return has;
    })
    return isConflict;
  });

  return {
    pull_number: pull_number,
    conflictPrs: result,
  };
}

module.exports = pullRequests;
