const { context } = require('@actions/github');

const leaveComment = async ({
    octokit,
    owner = context.repo.owner,
    repo = context.repo.repo,
    pull_number,
    body,
  }) => {
  await octokit.issues.createComment({
    owner,
    repo,
    issue_number: pull_number,
    body,
  });
}

module.exports = leaveComment;
