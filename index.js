const core = require('@actions/core');
const { GitHub } = require('@actions/github');

const pullRequests = require('./lib/pull-requests');
const leaveComment = require('./lib/comment');

const commentTpl = `This Pull Request may conflict if the Pull Requests below are merged first.\n\n`;

async function run() {
  try {
    // This should be a token with access to your repository scoped in as a secret.
    // The YML workflow will need to set myToken with the GitHub Secret Token
    // myToken: ${{ secrets.GITHUB_TOKEN }}
    // https://help.github.com/en/actions/automating-your-workflow-with-github-actions/authenticating-with-the-github_token#about-the-github_token-secret
    const ghToken = core.getInput('ghToken');
    const octokit = new GitHub(ghToken, {});

    const conflictInfo = await pullRequests({ octokit });
    core.debug(conflictInfo);

    if (conflictInfo.conflictPrs.length > 0) {
      // leave comment on current PR
      const body = commentTpl +
        conflictInfo.conflictPrs.map(c =>
          `PR: #${c.number}\n${c.conflicts.map(f => `\`${f}\``)}`
        );
      await leaveComment({
        octokit,
        pull_number: conflictInfo.pull_number,
        body,
      });

      // leave comments on target PR
      const promises = conflictInfo.conflictPrs.map(c => {
        const body = commentTpl +
          `PR: #${conflictInfo.pull_number}\n${c.conflicts.map(f => `\`${f}\``)}`;

        return leaveComment({
          octokit,
          pull_number: c.number,
          body,
        });
      });

      await Promise.all(promises);
    }
  }
  catch (error) {
    core.setFailed(error.message);
  }
}

run()
