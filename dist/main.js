"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path_1 = require("path");
const exec_1 = require("@actions/exec");
const core_1 = require("@actions/core");
const github_1 = require("@actions/github");
const { GITHUB_TOKEN, GITHUB_SHA } = process.env;
const ACTION_NAME = 'TSC';
async function lint(data) {
    const annotations = [];
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
        conclusion: annotations.length ? 'success' : 'failure',
        output: {
            title: ACTION_NAME,
            summary: annotations.length ? 'Green lights' : 'TSC error',
            annotations
        }
    };
}
async function check(data) {
    const octokit = new github_1.GitHub(GITHUB_TOKEN);
    let currentSha;
    let info;
    if (github_1.context.issue && github_1.context.issue.number) {
        try {
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
			}`, {
                owner: github_1.context.repo.owner,
                name: github_1.context.repo.repo,
                prNumber: github_1.context.issue.number
            });
        }
        catch {
            console.log('##[warning] Token doesn\'t have permission to access this resource.');
        }
        if (info)
            currentSha = info.repository.pullRequest.commits.nodes[0].commit.oid;
        else
            currentSha = GITHUB_SHA;
    }
    else {
        try {
            info = await octokit.repos.getCommit({ owner: github_1.context.repo.owner, repo: github_1.context.repo.repo, ref: GITHUB_SHA });
        }
        catch {
            console.log('##[warning] Token doesn\'t have permission to access this resource.');
        }
        currentSha = GITHUB_SHA;
    }
    core_1.debug(`Commit: ${currentSha}`);
    let id;
    const jobName = core_1.getInput('job-name');
    if (jobName) {
        try {
            const checks = await octokit.checks.listForRef({
                ...github_1.context.repo,
                status: 'in_progress',
                ref: currentSha
            });
            const check = checks.data.check_runs.find(({ name }) => name.toLowerCase() === jobName.toLowerCase());
            if (check)
                id = check.id;
        }
        catch {
            console.log('##[warning] Token doesn\'t have permission to access this resource.');
        }
    }
    if (!id) {
        try {
            id = (await octokit.checks.create({
                ...github_1.context.repo,
                name: ACTION_NAME,
                head_sha: currentSha,
                status: 'in_progress',
                started_at: new Date().toISOString()
            })).data.id;
        }
        catch {
            console.log('##[warning] Token doesn\'t have permission to access this resource.');
        }
    }
    try {
        const { conclusion, output } = await lint(data);
        if (id) {
            try {
                await octokit.checks.update({
                    ...github_1.context.repo,
                    check_run_id: id,
                    completed_at: new Date().toISOString(),
                    conclusion,
                    output
                });
            }
            catch {
                console.log('##[warning] Token doesn\'t have permission to access this resource.');
            }
        }
        core_1.debug(output.summary);
        if (conclusion === 'failure')
            core_1.setFailed(output.summary);
    }
    catch (error) {
        if (id) {
            try {
                await octokit.checks.update({
                    ...github_1.context.repo,
                    check_run_id: id,
                    conclusion: 'failure',
                    completed_at: new Date().toISOString()
                });
            }
            catch {
                console.log('##[warning] Token doesn\'t have permission to access this resource.');
            }
        }
        core_1.setFailed(error.message);
    }
}
async function run() {
    try {
        await exec_1.exec('node', [`${path_1.join(process.cwd(), 'node_modules/typescript/bin/tsc')}`, '--noEmit', '--noErrorTruncation', '--pretty', 'false'], {
            listeners: {
                stdout: async (data) => {
                    await check(data.toString());
                }
            }
        });
    }
    catch (error) {
        core_1.setFailed(error.message);
    }
}
run();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibWFpbi5qcyIsInNvdXJjZVJvb3QiOiIvIiwic291cmNlcyI6WyJtYWluLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7O0FBQUEsK0JBQTRCO0FBQzVCLHdDQUFxQztBQUNyQyx3Q0FBMkQ7QUFDM0QsNENBQWtEO0FBR2xELE1BQU0sRUFBRSxZQUFZLEVBQUUsVUFBVSxFQUFFLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQztBQUVqRCxNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUM7QUFFMUIsS0FBSyxVQUFVLElBQUksQ0FBQyxJQUFZO0lBQy9CLE1BQU0sV0FBVyxHQUEwQyxFQUFFLENBQUM7SUFDOUQsTUFBTSxPQUFPLEdBQUcsQ0FBQyxHQUFHLElBQUksQ0FBQyxRQUFRLENBQUMseURBQXlELENBQUMsQ0FBQyxDQUFDO0lBQzlGLEtBQUssTUFBTSxHQUFHLElBQUksT0FBTyxFQUFFO1FBQzFCLE1BQU0sQ0FBQyxFQUFFLElBQUksRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLFFBQVEsRUFBRSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsR0FBRyxDQUFDO1FBQzlELFdBQVcsQ0FBQyxJQUFJLENBQUM7WUFDaEIsSUFBSTtZQUNKLFVBQVUsRUFBRSxRQUFRLENBQUMsSUFBSSxFQUFFLEVBQUUsQ0FBQztZQUM5QixRQUFRLEVBQUUsUUFBUSxDQUFDLElBQUksRUFBRSxFQUFFLENBQUM7WUFDNUIsWUFBWSxFQUFFLFFBQVEsQ0FBQyxNQUFNLEVBQUUsRUFBRSxDQUFDO1lBQ2xDLFVBQVUsRUFBRSxRQUFRLENBQUMsTUFBTSxFQUFFLEVBQUUsQ0FBQztZQUNoQyxnQkFBZ0IsRUFBRSxRQUFRLEtBQUssT0FBTyxDQUFDLENBQUMsQ0FBQyxTQUFTLENBQUMsQ0FBQyxDQUFDLFNBQVM7WUFDOUQsS0FBSyxFQUFFLE1BQU0sSUFBSSxXQUFXO1lBQzVCLE9BQU87U0FDUCxDQUFDLENBQUM7S0FDSDtJQUVELE9BQU87UUFDTixVQUFVLEVBQUUsV0FBVyxDQUFDLE1BQU0s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RyxDQUFDLHFFQUFxRSxDQUFDLENBQUM7YUFDbkY7U0FDRDtRQUNELGdCQUFTLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0tBQ3pCO0FBQ0YsQ0FBQztBQUVELEtBQUssVUFBVSxHQUFHO0lBQ2pCLElBQUk7UUFDSCxNQUFNLFdBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQyxHQUFHLFdBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLEVBQUUsaUNBQWlDLENBQUMsRUFBRSxFQUFFLFVBQVUsRUFBRSxxQkFBcUIsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLEVBQUU7WUFDekksU0FBUyxFQUFFO2dCQUNWLE1BQU0sRUFBRSxLQUFLLEVBQUUsSUFBWSxFQUFFLEVBQUU7b0JBQzlCLE1BQU0sS0FBSyxDQUFDLElBQUksQ0FBQyxRQUFRLEVBQUUsQ0FBQyxDQUFDO2dCQUM5QixDQUFDO2FBQ0Q7U0FDRCxDQUFDLENBQUM7S0FDSDtJQUFDLE9BQU8sS0FBSyxFQUFFO1FBQ2YsZ0JBQVMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUM7S0FDekI7QUFDRixDQUFDO0FBRUQsR0FBRyxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBqb2luIH0gZnJvbSAncGF0aCc7XG5pbXBvcnQgeyBleGVjIH0gZnJvbSAnQGFjdGlvbnMvZXhlYyc7XG5pbXBvcnQgeyBnZXRJbnB1dCwgc2V0RmFpbGVkLCBkZWJ1ZyB9IGZyb20gJ0BhY3Rpb25zL2NvcmUnO1xuaW1wb3J0IHsgR2l0SHViLCBjb250ZXh0IH0gZnJvbSAnQGFjdGlvbnMvZ2l0aHViJztcbmltcG9ydCB7IENoZWNrc1VwZGF0ZVBhcmFtc091dHB1dEFubm90YXRpb25zLCBDaGVja3NDcmVhdGVQYXJhbXMgfSBmcm9tICdAb2N0b2tpdC9yZXN0JztcblxuY29uc3QgeyBHSVRIVUJfVE9LRU4sIEdJVEhVQl9TSEEgfSA9IHByb2Nlc3MuZW52O1xuXG5jb25zdCBBQ1RJT05fTkFNRSA9ICdUU0MnO1xuXG5hc3luYyBmdW5jdGlvbiBsaW50KGRhdGE6IHN0cmluZykge1xuXHRjb25zdCBhbm5vdGF0aW9uczogQ2hlY2tzVXBkYXRlUGFyYW1zT3V0cHV0QW5ub3RhdGlvbnNbXSA9IFtdO1xuXHRjb25zdCByZXN1bHRzID0gWy4uLmRhdGEubWF0Y2hBbGwoL14oW14oKV0rKVxcKChcXGQrKSwoXFxkKylcXCk6IChlcnJvcnx3YXJuaW5nKSAoLispOiAoLispJC9nbSldO1xuXHRmb3IgKGNvbnN0IHJlcyBvZiByZXN1bHRzKSB7XG5cdFx0Y29uc3QgWywgcGF0aCwgbGluZSwgY29sdW1uLCBzZXZlcml0eSwgcnVsZUlkLCBtZXNzYWdlXSA9IHJlcztcblx0XHRhbm5vdGF0aW9ucy5wdXNoKHtcblx0XHRcdHBhdGgsXG5cdFx0XHRzdGFydF9saW5lOiBwYXJzZUludChsaW5lLCAxMCksXG5cdFx0XHRlbmRfbGluZTogcGFyc2VJbnQobGluZSwgMTApLFxuXHRcdFx0c3RhcnRfY29sdW1uOiBwYXJzZUludChjb2x1bW4sIDEwKSxcblx0XHRcdGVuZF9jb2x1bW46IHBhcnNlSW50KGNvbHVtbiwgMTApLFxuXHRcdFx0YW5ub3RhdGlvbl9sZXZlbDogc2V2ZXJpdHkgPT09ICdlcnJvcicgPyAnZmFpbHVyZScgOiAnd2FybmluZycsXG5cdFx0XHR0aXRsZTogcnVsZUlkIHx8IEFDVElPTl9OQU1FLFxuXHRcdFx0bWVzc2FnZVxuXHRcdH0pO1xuXHR9XG5cblx0cmV0dXJuIHtcblx0XHRjb25jbHVzaW9uOiBhbm5vdGF0aW9ucy5sZW5ndGggPyAnc3VjY2VzcycgOiAnZmFpbHVyZScgYXMgQ2hlY2tzQ3JlYXRlUGFyYW1zWydjb25jbHVzaW9uJ10sXG5cdFx0b3V0cHV0OiB7XG5cdFx0XHR0aXRsZTogQUNUSU9OX05BTUUsXG5cdFx0XHRzdW1tYXJ5OiBhbm5vdGF0aW9ucy5sZW5ndGggPyAnR3JlZW4gbGlnaHRzJyA6ICdUU0MgZXJyb3InLFxuXHRcdFx0YW5ub3RhdGlvbnNcblx0XHR9XG5cdH07XG59XG5cbmFzeW5jIGZ1bmN0aW9uIGNoZWNrKGRhdGE6IHN0cmluZykge1xuXHRjb25zdCBvY3Rva2l0ID0gbmV3IEdpdEh1YihHSVRIVUJfVE9LRU4hKTtcblxuXHRsZXQgY3VycmVudFNoYTogc3RyaW5nO1xuXHRsZXQgaW5mbztcblx0aWYgKGNvbnRleHQuaXNzdWUgJiYgY29udGV4dC5pc3N1ZS5udW1iZXIpIHtcblx0XHR0cnkge1xuXHRcdFx0aW5mbyA9IGF3YWl0IG9jdG9raXQuZ3JhcGhxbChgcXVlcnkoJG93bmVyOiBTdHJpbmchLCAkbmFtZTogU3RyaW5nISwgJHByTnVtYmVyOiBJbnQhKSB7XG5cdFx0XHRcdHJlcG9zaXRvcnkob3duZXI6ICRvd25lciwgbmFtZTogJG5hbWUpIHtcblx0XHRcdFx0XHRwdWxsUmVxdWVzdChudW1iZXI6ICRwck51bWJlcikge1xuXHRcdFx0XHRcdFx0ZmlsZXMoZmlyc3Q6IDEwMCkge1xuXHRcdFx0XHRcdFx0XHRub2RlcyB7XG5cdFx0XHRcdFx0XHRcdFx0cGF0aFxuXHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRjb21taXRzKGxhc3Q6IDEpIHtcblx0XHRcdFx0XHRcdFx0bm9kZXMge1xuXHRcdFx0XHRcdFx0XHRcdGNvbW1pdCB7XG5cdFx0XHRcdFx0XHRcdFx0XHRvaWRcblx0XHRcdFx0XHRcdFx0XHR9XG5cdFx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHRcdH1cblx0XHRcdFx0XHR9XG5cdFx0XHRcdH1cblx0XHRcdH1gLFxuXHRcdFx0e1xuXHRcdFx0XHRvd25lcjogY29udGV4dC5yZXBvLm93bmVyLFxuXHRcdFx0XHRuYW1lOiBjb250ZXh0LnJlcG8ucmVwbyxcblx0XHRcdFx0cHJOdW1iZXI6IGNvbnRleHQuaXNzdWUubnVtYmVyXG5cdFx0XHR9KTtcblx0XHR9IGNhdGNoIHtcblx0XHRcdGNvbnNvbGUubG9nKCcjI1t3YXJuaW5nXSBUb2tlbiBkb2VzblxcJ3QgaGF2ZSBwZXJtaXNzaW9uIHRvIGFjY2VzcyB0aGlzIHJlc291cmNlLicpO1xuXHRcdH1cblx0XHRpZiAoaW5mbykgY3VycmVudFNoYSA9IGluZm8ucmVwb3NpdG9yeS5wdWxsUmVxdWVzdC5jb21taXRzLm5vZGVzWzBdLmNvbW1pdC5vaWQ7XG5cdFx0ZWxzZSBjdXJyZW50U2hhID0gR0lUSFVCX1NIQSE7XG5cdH0gZWxzZSB7XG5cdFx0dHJ5IHtcblx0XHRcdGluZm8gPSBhd2FpdCBvY3Rva2l0LnJlcG9zLmdldENvbW1pdCh7IG93bmVyOiBjb250ZXh0LnJlcG8ub3duZXIsIHJlcG86IGNvbnRleHQucmVwby5yZXBvLCByZWY6IEdJVEhVQl9TSEEhIH0pO1xuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Y29uc29sZS5sb2coJyMjW3dhcm5pbmddIFRva2VuIGRvZXNuXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgcmVzb3VyY2UuJyk7XG5cdFx0fVxuXHRcdGN1cnJlbnRTaGEgPSBHSVRIVUJfU0hBITtcblx0fVxuXHRkZWJ1ZyhgQ29tbWl0OiAke2N1cnJlbnRTaGF9YCk7XG5cblx0bGV0IGlkOiBudW1iZXIgfCB1bmRlZmluZWQ7XG5cdGNvbnN0IGpvYk5hbWUgPSBnZXRJbnB1dCgnam9iLW5hbWUnKTtcblx0aWYgKGpvYk5hbWUpIHtcblx0XHR0cnkge1xuXHRcdFx0Y29uc3QgY2hlY2tzID0gYXdhaXQgb2N0b2tpdC5jaGVja3MubGlzdEZvclJlZih7XG5cdFx0XHRcdC4uLmNvbnRleHQucmVwbyxcblx0XHRcdFx0c3RhdHVzOiAnaW5fcHJvZ3Jlc3MnLFxuXHRcdFx0XHRyZWY6IGN1cnJlbnRTaGFcblx0XHRcdH0pO1xuXHRcdFx0Y29uc3QgY2hlY2sgPSBjaGVja3MuZGF0YS5jaGVja19ydW5zLmZpbmQoKHsgbmFtZSB9KSA9PiBuYW1lLnRvTG93ZXJDYXNlKCkgPT09IGpvYk5hbWUudG9Mb3dlckNhc2UoKSk7XG5cdFx0XHRpZiAoY2hlY2spIGlkID0gY2hlY2suaWQ7XG5cdFx0fSBjYXRjaCB7XG5cdFx0XHRjb25zb2xlLmxvZygnIyNbd2FybmluZ10gVG9rZW4gZG9lc25cXCd0IGhhdmUgcGVybWlzc2lvbiB0byBhY2Nlc3MgdGhpcyByZXNvdXJjZS4nKTtcblx0XHR9XG5cdH1cblx0aWYgKCFpZCkge1xuXHRcdHRyeSB7XG5cdFx0XHRpZCA9IChhd2FpdCBvY3Rva2l0LmNoZWNrcy5jcmVhdGUoe1xuXHRcdFx0XHQuLi5jb250ZXh0LnJlcG8sXG5cdFx0XHRcdG5hbWU6IEFDVElPTl9OQU1FLFxuXHRcdFx0XHRoZWFkX3NoYTogY3VycmVudFNoYSxcblx0XHRcdFx0c3RhdHVzOiAnaW5fcHJvZ3Jlc3MnLFxuXHRcdFx0XHRzdGFydGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcblx0XHRcdH0pKS5kYXRhLmlkO1xuXHRcdH0gY2F0Y2gge1xuXHRcdFx0Y29uc29sZS5sb2coJyMjW3dhcm5pbmddIFRva2VuIGRvZXNuXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgcmVzb3VyY2UuJyk7XG5cdFx0fVxuXHR9XG5cblx0dHJ5IHtcblx0XHRjb25zdCB7IGNvbmNsdXNpb24sIG91dHB1dCB9ID0gYXdhaXQgbGludChkYXRhKTtcblx0XHRpZiAoaWQpIHtcblx0XHRcdHRyeSB7XG5cdFx0XHRcdGF3YWl0IG9jdG9raXQuY2hlY2tzLnVwZGF0ZSh7XG5cdFx0XHRcdFx0Li4uY29udGV4dC5yZXBvLFxuXHRcdFx0XHRcdGNoZWNrX3J1bl9pZDogaWQsXG5cdFx0XHRcdFx0Y29tcGxldGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXG5cdFx0XHRcdFx0Y29uY2x1c2lvbixcblx0XHRcdFx0XHRvdXRwdXRcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGNhdGNoIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJyMjW3dhcm5pbmddIFRva2VuIGRvZXNuXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgcmVzb3VyY2UuJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdGRlYnVnKG91dHB1dC5zdW1tYXJ5KTtcblx0XHRpZiAoY29uY2x1c2lvbiA9PT0gJ2ZhaWx1cmUnKSBzZXRGYWlsZWQob3V0cHV0LnN1bW1hcnkpO1xuXHR9IGNhdGNoIChlcnJvcikge1xuXHRcdGlmIChpZCkge1xuXHRcdFx0dHJ5IHtcblx0XHRcdFx0YXdhaXQgb2N0b2tpdC5jaGVja3MudXBkYXRlKHtcblx0XHRcdFx0XHQuLi5jb250ZXh0LnJlcG8sXG5cdFx0XHRcdFx0Y2hlY2tfcnVuX2lkOiBpZCxcblx0XHRcdFx0XHRjb25jbHVzaW9uOiAnZmFpbHVyZScsXG5cdFx0XHRcdFx0Y29tcGxldGVkX2F0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcblx0XHRcdFx0fSk7XG5cdFx0XHR9IGNhdGNoIHtcblx0XHRcdFx0Y29uc29sZS5sb2coJyMjW3dhcm5pbmddIFRva2VuIGRvZXNuXFwndCBoYXZlIHBlcm1pc3Npb24gdG8gYWNjZXNzIHRoaXMgcmVzb3VyY2UuJyk7XG5cdFx0XHR9XG5cdFx0fVxuXHRcdHNldEZhaWxlZChlcnJvci5tZXNzYWdlKTtcblx0fVxufVxuXG5hc3luYyBmdW5jdGlvbiBydW4oKSB7XG5cdHRyeSB7XG5cdFx0YXdhaXQgZXhlYygnbm9kZScsIFtgJHtqb2luKHByb2Nlc3MuY3dkKCksICdub2RlX21vZHVsZXMvdHlwZXNjcmlwdC9iaW4vdHNjJyl9YCwgJy0tbm9FbWl0JywgJy0tbm9FcnJvclRydW5jYXRpb24nLCAnLS1wcmV0dHknLCAnZmFsc2UnXSwge1xuXHRcdFx0bGlzdGVuZXJzOiB7XG5cdFx0XHRcdHN0ZG91dDogYXN5bmMgKGRhdGE6IEJ1ZmZlcikgPT4ge1xuXHRcdFx0XHRcdGF3YWl0IGNoZWNrKGRhdGEudG9TdHJpbmcoKSk7XG5cdFx0XHRcdH1cblx0XHRcdH1cblx0XHR9KTtcblx0fSBjYXRjaCAoZXJyb3IpIHtcblx0XHRzZXRGYWlsZWQoZXJyb3IubWVzc2FnZSk7XG5cdH1cbn1cblxucnVuKCk7XG4iXX0=