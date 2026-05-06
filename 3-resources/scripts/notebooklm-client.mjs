#!/usr/bin/env node
/**
 * OpenClaw NotebookLM 통합 클라이언트
 * 사용법: node notebooklm-client.mjs <command> [args]
 * 
 * 명령어:
 *   list              - 노트북 목록 조회
 *   ask <id> <query>  - 노트북에 질문
 *   create <title>    - 새 노트북 생성
 *   sources <id>      - 노트북 소스 목록
 *   help              - 도움말
 */

import { NotebookLMClient } from 'notebooklm';
import fs from 'fs';
import path from 'path';
import os from 'os';

const STORAGE_PATH = path.join(os.homedir(), '.notebooklm', 'storage-state.json');

async function getClient() {
  if (!fs.existsSync(STORAGE_PATH)) {
    console.error('❌ 인증이 필요합니다. 먼저 다음 명령어를 실행하세요:');
    console.error('   npx notebooklm login');
    process.exit(1);
  }
  
  return await NotebookLMClient.fromStorage(STORAGE_PATH);
}

async function listNotebooks() {
  const client = await getClient();
  const notebooks = await client.notebooks.list();
  
  console.log('\n📚 NotebookLM 노트북 목록:');
  console.log('='.repeat(50));
  
  if (notebooks.length === 0) {
    console.log('  노트북이 없습니다.');
    return;
  }
  
  for (const nb of notebooks) {
    console.log(`  📓 ${nb.title || '제목 없음'}`);
    console.log(`     ID: ${nb.id}`);
    console.log(`     생성: ${nb.createdAt || 'N/A'}`);
    console.log('');
  }
}

async function askQuestion(notebookId, query) {
  const client = await getClient();
  
  console.log(`\n🤖 질문: ${query}`);
  console.log('='.repeat(50));
  
  const response = await client.chat.ask(notebookId, query);
  
  console.log('\n💡 답변:');
  console.log(response.answer);
  
  if (response.references && response.references.length > 0) {
    console.log('\n📖 참고 자료:');
    for (const ref of response.references) {
      console.log(`  - ${ref.title || ref.id}`);
    }
  }
}

async function createNotebook(title) {
  const client = await getClient();
  
  console.log(`\n📝 노트북 생성 중: ${title}`);
  
  const notebook = await client.notebooks.create(title);
  
  console.log(`✅ 생성 완료!`);
  console.log(`   ID: ${notebook.id}`);
  console.log(`   제목: ${notebook.title}`);
  
  return notebook;
}

async function listSources(notebookId) {
  const client = await getClient();
  
  const sources = await client.sources.list(notebookId);
  
  console.log(`\n📄 소스 목록:`);
  console.log('='.repeat(50));
  
  if (sources.length === 0) {
    console.log('  소스가 없습니다.');
    return;
  }
  
  for (const src of sources) {
    console.log(`  📄 ${src.title || '제목 없음'}`);
    console.log(`     ID: ${src.id}`);
    console.log(`     상태: ${src.status || 'N/A'}`);
    console.log('');
  }
}

function printHelp() {
  console.log(`
📖 OpenClaw NotebookLM 클라이언트

사용법:
  node notebooklm-client.mjs <command> [args]

명령어:
  list                노트북 목록 조회
  ask <id> <query>    노트북에 질문
  create <title>      새 노트북 생성
  sources <id>        노트북 소스 목록
  help                이 도움말

인증:
  먼저 다음 명령어로 로그인하세요:
  npx notebooklm login

노트북 URL:
  https://notebooklm.google.com/notebook/<id>
`);
}

// 메인 실행
const [,, command, ...args] = process.argv;

async function main() {
  try {
    switch (command) {
      case 'list':
        await listNotebooks();
        break;
      case 'ask':
        if (args.length < 2) {
          console.error('사용법: node notebooklm-client.mjs ask <notebook-id> <query>');
          process.exit(1);
        }
        await askQuestion(args[0], args.slice(1).join(' '));
        break;
      case 'create':
        if (args.length < 1) {
          console.error('사용법: node notebooklm-client.mjs create <title>');
          process.exit(1);
        }
        await createNotebook(args.join(' '));
        break;
      case 'sources':
        if (args.length < 1) {
          console.error('사용법: node notebooklm-client.mjs sources <notebook-id>');
          process.exit(1);
        }
        await listSources(args[0]);
        break;
      case 'help':
      case undefined:
        printHelp();
        break;
      default:
        console.error(`알 수 없는 명령어: ${command}`);
        printHelp();
        process.exit(1);
    }
  } catch (error) {
    console.error('❌ 오류:', error.message);
    process.exit(1);
  }
}

main();