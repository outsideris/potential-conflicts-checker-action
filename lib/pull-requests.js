const { context } = require('@actions/github');
const signale = require('signale');

const pullRequests = async ({
    octokit,
    owner = context.repo.owner,
    repo = context.repo.repo,
    sha = context.sha,
  }) => {
  signale.debug({prefix: '[pr]', message: {owner, repo, sha}});
  const thisPR = await octokit.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: sha,
  });

  const thisPrNo = thisPR.data[0].number;
  signale.debug({prefix: '[pr]', message: `pr number is ${thisPrNo}`});

  const files = await octokit.pulls.listFiles({
    owner,
    repo,
    pull_number: thisPrNo,
    per_page: 100,
  });

  const changedFiles = files.data.map(f => f.filename);

  const prAllList = await octokit.pulls.list({
    owner,
    repo,
    state: 'open',
    head: thisPR.data[0].base.ref,
    per_page: 100,
  });

  const openedPrs = prAllList.data.filter(d => d.number !== thisPrNo);
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
    pull_number: thisPrNo,
    conflictPrs: result,
  };
}

module.exports = pullRequests;
