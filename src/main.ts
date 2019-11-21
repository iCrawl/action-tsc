import { join } from 'path';
import { exec } from '@actions/exec';
import { getInput, setFailed, debug } from '@actions/core';
import { GitHub, context } from '@actions/github';
import {
	ChecksUpdateParamsOutputAnnotations,
	ChecksCreateParams
} from '@octokit/rest';

const { GITHUB_TOKEN, GITHUB_SHA } = process.env;

const ACTION_NAME = 'TSC';

async function lint(data: string) {
	const annotations: ChecksUpdateParamsOutputAnnotations[] = [];
	const results = [
		...data.matchAll(/^([^()]+)\((\d+),(\d+)\): (error|warning) (.+): (.+)$/gm)
	];
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
		conclusion: annotations.length
			? 'success'
			: ('failure' as ChecksCreateParams['conclusion']),
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
		try {
			info = await octokit.graphql(
				`query($owner: String!, $name: String!, $prNumber: Int!) {
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
				}
			);
		} catch {
			console.log(
				"##[warning] Token doesn't have permission to access this resource."
			);
		}
		if (info) {
			currentSha = info.repository.pullRequest.commits.nodes[0].commit.oid;
		} else {
			currentSha = GITHUB_SHA!;
		}
	} else {
		try {
			info = await octokit.repos.getCommit({
				owner: context.repo.owner,
				repo: context.repo.repo,
				ref: GITHUB_SHA!
			});
		} catch {
			console.log(
				"##[warning] Token doesn't have permission to access this resource."
			);
		}
		currentSha = GITHUB_SHA!;
	}
	debug(`Commit: ${currentSha}`);

	let id: number | undefined;
	const jobName = getInput('job-name');
	if (jobName) {
		try {
			const checks = await octokit.checks.listForRef({
				...context.repo,
				status: 'in_progress',
				ref: currentSha
			});
			const check = checks.data.check_runs.find(
				({ name }) => name.toLowerCase() === jobName.toLowerCase()
			);
			if (check) id = check.id;
		} catch {
			console.log(
				"##[warning] Token doesn't have permission to access this resource."
			);
		}
	}
	if (!id) {
		try {
			id = (await octokit.checks.create({
				...context.repo,
				name: ACTION_NAME,
				head_sha: currentSha,
				status: 'in_progress',
				started_at: new Date().toISOString()
			})).data.id;
		} catch {
			console.log(
				"##[warning] Token doesn't have permission to access this resource."
			);
		}
	}

	try {
		const { conclusion, output } = await lint(data);
		if (id) {
			try {
				await octokit.checks.update({
					...context.repo,
					check_run_id: id,
					completed_at: new Date().toISOString(),
					conclusion,
					output
				});
			} catch {
				console.log(
					"##[warning] Token doesn't have permission to access this resource."
				);
			}
		}
		debug(output.summary);
		if (conclusion === 'failure') setFailed(output.summary);
	} catch (error) {
		if (id) {
			try {
				await octokit.checks.update({
					...context.repo,
					check_run_id: id,
					conclusion: 'failure',
					completed_at: new Date().toISOString()
				});
			} catch {
				console.log(
					"##[warning] Token doesn't have permission to access this resource."
				);
			}
		}
		setFailed(error.message);
	}
}

async function run() {
	const project = getInput('project');

	const args = [
		`${join(process.cwd(), 'node_modules/typescript/bin/tsc')}`,

		'--noEmit',
		'--noErrorTruncation',
		'--pretty',
		'false'
	];

	if (project) {
		args.push('--project');
		args.push(project);
	}
	try {
		await exec('node', args, {
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
