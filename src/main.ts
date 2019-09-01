import { join } from 'path';
import { exec } from '@actions/exec';
import { getInput, setFailed, debug } from '@actions/core';
import { GitHub, context } from '@actions/github';
import { ChecksUpdateParamsOutputAnnotations, ChecksCreateParams } from '@octokit/rest';

const { GITHUB_TOKEN, GITHUB_SHA } = process.env;

const ACTION_NAME = 'TSC';

async function lint(data: string) {
	const annotations: ChecksUpdateParamsOutputAnnotations[] = [];
	const results = [...data.matchAll(/^([^()]+)\((\d+),(\d+)\): (error|warning) (.+): (.+)$/gm)];
	for (const res of results) {
		const [, path, line, column, severity, ruleId, message] = res;
		annotations.push({
			path,
			start_line: parseInt(line, 10),
			end_line: parseInt(line, 10),
			start_column: parseInt(column, 10),
			end_column: parseInt(column, 10),
			annotation_level: severity === 'error' ? 'failure' : 'warning',
			title: ruleId || ACTION_NAME,
			message
		});
	}

	return {
		conclusion: annotations.length ? 'success' : 'failure' as ChecksCreateParams['conclusion'],
		output: {
			title: ACTION_NAME,
			summary: annotations.length ? 'Green lights' : 'TSC error',
			annotations
		}
	};
}

async function check(data: string) {
	const octokit = new GitHub(GITHUB_TOKEN!);

	let currentSha: string;
	let info;
	if (context.issue && context.issue.number) {
		info = await octokit.graphql(`query($owner: String!, $name: String!, $prNumber: Int!) {
			repository(owner: $owner, name: $name) {
				pullRequest(number: $prNumber) {
					files(first: 100) {
						nodes {
							path
						}
					}
					commits(last: 1) {
						nodes {
							commit {
								oid
							}
						}
					}
				}
			}
		}`,
		{
			owner: context.repo.owner,
			name: context.repo.repo,
			prNumber: context.issue.number
		});
		currentSha = info.repository.pullRequest.commits.nodes[0].commit.oid;
	} else {
		info = await octokit.repos.getCommit({ owner: context.repo.owner, repo: context.repo.repo, ref: GITHUB_SHA! });
		currentSha = GITHUB_SHA!;
	}
	debug(`Commit: ${currentSha}`);

	let id: number | undefined;
	const jobName = getInput('job-name');
	if (jobName) {
		const checks = await octokit.checks.listForRef({
			...context.repo,
			status: 'in_progress',
			ref: currentSha
		});
		const check = checks.data.check_runs.find(({ name }) => name.toLowerCase() === jobName.toLowerCase());
		if (check) id = check.id;
	}
	if (!id) {
		id = (await octokit.checks.create({
			...context.repo,
			name: ACTION_NAME,
			head_sha: currentSha,
			status: 'in_progress',
			started_at: new Date().toISOString()
		})).data.id;
	}

	try {
		const { conclusion, output } = await lint(data);
		await octokit.checks.update({
			...context.repo,
			check_run_id: id,
			completed_at: new Date().toISOString(),
			conclusion,
			output
		});
		debug(output.summary);
		if (conclusion === 'failure') setFailed(output.summary);
	} catch (error) {
		await octokit.checks.update({
			...context.repo,
			check_run_id: id,
			conclusion: 'failure',
			completed_at: new Date().toISOString()
		});
		setFailed(error.message);
	}
}

async function run() {
	try {
		await exec('node', [`${join(process.cwd(), 'node_modules/typescript/bin/tsc')}`, '--noEmit', '--noErrorTruncation', '--pretty', 'false'], {
			listeners: {
				stdout: async (data: Buffer) => {
					await check(data.toString());
				}
			}
		});
	} catch (error) {
		setFailed(error.message);
	}
}

run();
