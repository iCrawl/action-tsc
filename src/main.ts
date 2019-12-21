import { join } from 'path';
import { exec } from '@actions/exec';
import { getInput } from '@actions/core';

async function run() {
	const project = getInput('project');
	const build = getInput('project');
	console.log(`##[add-matcher]${join(__dirname, '..', '.github', 'tsc.json')}`);
	const args = [
		`${join(process.cwd(), 'node_modules/typescript/bin/tsc')}`,
		'--noEmit',
		'--noErrorTruncation',
		'--pretty',
		'false',
	];
	if (project) {
		args.push('--project', project);
	}
	if (build) {
		args.push('--build', build);
	}
	await exec('node', args);
}

run();
