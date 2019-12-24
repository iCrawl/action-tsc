import { join } from 'path';
import { exec } from '@actions/exec';
import { getInput, setFailed } from '@actions/core';

async function run() {
	const project = getInput('project');
	const build = getInput('build');
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
	try {
		await exec('node', args);
	} catch (error) {
		setFailed('');
	}
}

run();
