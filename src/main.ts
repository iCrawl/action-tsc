import { getInput, setFailed } from '@actions/core';
import { exec } from '@actions/exec';
import { join } from 'path';

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
		'--incremental',
		'false',
	];
	if (project) {
		args.push('--project', project);
	}
	if (build) {
		args.splice(1, 0, '--build', build);
		// Remove --noEmit and --noErrorTruncation, which are unsupported with --build
		args.splice(3, 2);
		// Change --incremental false for --incremental true, as incremental builds are required for composite builds
		args.splice(-1, 1, 'true');
	}
	try {
		await exec('node', args);
	} catch (error) {
		setFailed('');
	}
}

void run();
