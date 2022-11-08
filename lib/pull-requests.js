const { context } = require('@actions/github');
const signale = require('signale');
const PER_PAGE = 10

const pullRequests = async ({
    octokit,
    owner = context.repo.owner,
    repo = context.repo.repo,
    pull_number = context.payload.pull_request.number,
    base = context.payload.pull_request.base.ref
  }) => {
  signale.debug({prefix: '[pr]', message: {owner, repo, pull_number, base}});

  const commands = {
    files: (page, pullNumber) => `GET /repos/${owner}/${repo}/pulls/${pullNumber}/files?per_page=${PER_PAGE}&page=${page}`,
    prs: (page) => `GET /repos/${owner}/${repo}/pulls?state=open&per_page=${PER_PAGE}&page=${page}`
  }

  const fetchPaginated = async (command, page = 1, list = []) => {
    const files = await octokit.request(command)
    if (!files.data.length) {
      return list
    } else {
      list.push(...files.data)
      return fetchPaginated(commands[type](page, pull_number), page + 1, list)
    }
  }
  const files = fetchPaginated(commands.files(1, pull_number))

  const changedFiles = files.map(f => f.filename);

  const prAllList = fetchPaginated(commands.prs())

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
