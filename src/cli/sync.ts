import fs from 'fs/promises';
import path from 'path';
import ts from 'typescript';
import { logger } from '../utils/logger.js';
import type { TranspilerConfig } from '../types/index.js';

export async function runSyncCommand(config: TranspilerConfig) {
  const manifestPath = path.resolve(process.cwd(), config.manifestPath);
  let manifest: any;

  try {
    const manifestStr = await fs.readFile(manifestPath, 'utf-8');
    manifest = JSON.parse(manifestStr);
  } catch {
    logger.error(`❌ [ERROR] Could not read manifest at ${manifestPath}`);
    process.exit(1);
  }

  const importPath = config.frameworkImport;
  if (importPath.startsWith('@binkley/markdown-bdd-transpiler')) {
    logger.info(
      'ℹ️  Framework import is the standard library. Nothing to sync.'
    );
    return;
  }

  let resolvedPath: string;
  if (importPath.startsWith('.')) {
    const outDirPath = path.resolve(process.cwd(), config.outDir);
    resolvedPath = path.resolve(outDirPath, importPath);
  } else {
    // If it's something else (like an alias or node_module), we might not be able to resolve it easily,
    // but we can try resolving relative to cwd as a fallback
    resolvedPath = path.resolve(process.cwd(), importPath);
  }

  // Try to find the .ts file if .js is specified, or .ts if no extension
  const tryPaths = [
    resolvedPath,
    resolvedPath + '.ts',
    resolvedPath.replace(/\.js$/, '.ts'),
    resolvedPath + '/index.ts'
  ];

  let foundPath: string | undefined;
  for (const p of tryPaths) {
    try {
      const stat = await fs.stat(p);
      if (stat.isFile()) {
        foundPath = p;
        break;
      }
    } catch {
      // Ignore
    }
  }

  if (!foundPath) {
    logger.error(`❌ [ERROR] Could not find source file for ${importPath}`);
    process.exit(1);
  }

  logger.info(`🔍 Parsing AST for ${foundPath}...`);

  const sourceFile = ts.createSourceFile(
    foundPath,
    await fs.readFile(foundPath, 'utf-8'),
    ts.ScriptTarget.Latest,
    true
  );

  const newSteps: any[] = [];

  function visit(node: ts.Node) {
    if (
      ts.isFunctionDeclaration(node) &&
      node.name &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      const function_name = node.name.text;

      // Skip if already in manifest
      if (
        manifest.available_steps?.some(
          (s: any) => s.function_name === function_name
        )
      ) {
        return;
      }

      // Extract description from JSDoc
      let description = `Executes ${function_name} step.`;
      const jsDoc = (node as any).jsDoc;
      if (jsDoc && jsDoc.length > 0) {
        description =
          typeof jsDoc[0].comment === 'string'
            ? jsDoc[0].comment
            : jsDoc[0].getText(sourceFile);
        // Simple clean up
        description = description
          .replace(/^\/\*\*\s*/, '')
          .replace(/\s*\*\/\s*$/, '')
          .replace(/^\s*\*\s?/gm, '')
          .trim();
      }

      // Extract parameters (skip 'page' parameter)
      const parameters = node.parameters
        .filter((p) => p.name.getText() !== 'page')
        .map((p) => p.name.getText());

      newSteps.push({
        function_name,
        description,
        parameters
      });
    } else if (
      ts.isVariableStatement(node) &&
      node.modifiers?.some((m) => m.kind === ts.SyntaxKind.ExportKeyword)
    ) {
      // Handle exported arrow functions
      for (const declaration of node.declarationList.declarations) {
        if (
          ts.isIdentifier(declaration.name) &&
          declaration.initializer &&
          (ts.isArrowFunction(declaration.initializer) ||
            ts.isFunctionExpression(declaration.initializer))
        ) {
          const function_name = declaration.name.text;

          if (
            manifest.available_steps?.some(
              (s: any) => s.function_name === function_name
            )
          ) {
            continue;
          }

          let description = `Executes ${function_name} step.`;
          const jsDoc = (node as any).jsDoc;
          if (jsDoc && jsDoc.length > 0) {
            description =
              typeof jsDoc[0].comment === 'string'
                ? jsDoc[0].comment
                : jsDoc[0].getText(sourceFile);
            description = description
              .replace(/^\/\*\*\s*/, '')
              .replace(/\s*\*\/\s*$/, '')
              .replace(/^\s*\*\s?/gm, '')
              .trim();
          }

          const parameters = declaration.initializer.parameters
            .filter((p) => p.name.getText() !== 'page')
            .map((p) => p.name.getText());

          newSteps.push({
            function_name,
            description,
            parameters
          });
        }
      }
    }

    ts.forEachChild(node, visit);
  }

  visit(sourceFile);

  if (newSteps.length > 0) {
    if (!manifest.available_steps) {
      manifest.available_steps = [];
    }
    manifest.available_steps.push(...newSteps);
    await fs.writeFile(manifestPath, JSON.stringify(manifest, null, 2));
    logger.info(
      `✅ Synced ${newSteps.length} new step(s) to ${manifestPath}`
    );
  } else {
    logger.info(`ℹ️  No new steps to sync to manifest.`);
  }

  const DEPRECATED_CUSTOM_STEPS: Record<string, string> = {
    verify_text_hidden: 'verify_text_state',
    verify_text_visible: 'verify_text_state',
    fill_input_by_id: 'fill_input_testid',
    click_button_by_id: 'interact_with_testid',
    interact_with_id: 'interact_with_testid'
  };

  for (const step of manifest.available_steps || []) {
    const replacement = DEPRECATED_CUSTOM_STEPS[step.function_name];
    if (replacement) {
      logger.warn(
        `⚠️  Warning: Custom capability '${step.function_name}' is now handled natively. Consider migrating to the standard '${replacement}' implementation.`
      );
    }
  }
}
