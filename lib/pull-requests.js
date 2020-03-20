const { GitHub, context } = require('@actions/github');

const pullRequests = async ({
    ghToken,
    owner = context.repo.owner,
    repo = context.repo.repo,
    sha = context.sha,
  }) => {
  const octokit = new GitHub(ghToken, {});

  const thisPR = await octokit.repos.listPullRequestsAssociatedWithCommit({
    owner,
    repo,
    commit_sha: sha,
  });

  const thisPrNo = thisPR.data[0].number;

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

  return result;
}

module.exports = pullRequests;
