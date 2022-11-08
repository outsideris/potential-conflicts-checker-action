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

  const getFiles = async (pullNumber = pull_number, page = 1, list = []) => {
    const files = await octokit.request(`GET /repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=${per_page}&page=${page}`)
    if (!files.data.length) {
      return list
    } else {
      list.push(...files.data)
      return getFiles(page + 1, list)
    }
  }
  const files = await getFiles()

  const changedFiles = files.map(f => f.filename);

  const getPulls = async (page = 1, list = []) => {
    const pulls = await octokit.request(`GET /repos/${owner}/${repo}/pulls?state=open&per_page=${per_page}&page=${page}`)
    if (!pulls.data.length) {
      return list
    } else {
      list.push(...pulls.data)
      return getFiles(page + 1, list)
    }
  }
  const prAllList = await getPulls()

  const openedPrs = prAllList.filter(d => d.number !== pull_number);
  const allFiles = openedPrs.map(async x => {
    const files = getFiles(x.number)
    return {
      number: x.number,
      files: files.map(f => f.filename),
      conflicts: [],
    }
  })

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
