/* eslint-disable no-console */
import type { Rule } from 'eslint';
import type { ArrowFunctionExpression } from 'estree';

export const customHookReturn: Rule.RuleModule = {
  meta: {
    type: 'problem',
    docs: {
      description: 'Custom hooks must return only stable references',
      category: 'Variables',
      recommended: true,
      url: 'https://github.com/BuilderIO/qwik',
    },
    messages: {
      'non-stable-return': 'Return values of a hook should only contain stable references.',
    },
  },
  create(context) {
    const modifyJsxSource = context
      .getSourceCode()
      .getAllComments()
      .some((c) => c.value.includes('@jsxImportSource'));
    if (modifyJsxSource) {
      return {};
    }


    const stack: { hook: boolean }[] = [];
    return {
      ArrowFunctionExpression(node: ArrowFunctionExpression & Rule.NodeParentExtension) {
        stack.push({ hook: node });
      },
      ReturnStatement: (node) {

      }
      'ArrowFunctionExpression:exit'(d) {
        stack.pop();
      },
      AwaitExpression() {
        const last = stack[stack.length - 1];
        if (last) {
          last.await = true;
        }
      },
      'CallExpression[callee.name=/^use[A-Z]/]'(node: CallExpression & Rule.NodeParentExtension) {
        const last = stack[stack.length - 1];
        if (last && last.await) {
          context.report({
            node,
            messageId: 'use-after-await',
          });
        }
        let parent = node as Rule.Node;
        while ((parent = parent.parent)) {
          const type = parent.type;
          switch (type) {
            case 'VariableDeclarator':
            case 'VariableDeclaration':
            case 'ExpressionStatement':
            case 'MemberExpression':
            case 'BinaryExpression':
            case 'UnaryExpression':
            case 'ReturnStatement':
            case 'BlockStatement':
            case 'ChainExpression':
              break;
            case 'ArrowFunctionExpression':
            case 'FunctionExpression':
              if (parent.parent.type === 'VariableDeclarator') {
                if (
                  parent.parent.id?.type === 'Identifier' &&
                  parent.parent.id.name.startsWith('use')
                ) {
                  return;
                }
              }
              if (parent.parent.type === 'CallExpression') {
                if (
                  parent.parent.callee.type === 'Identifier' &&
                  parent.parent.callee.name === 'component$'
                ) {
                  return;
                }
              }
              context.report({
                node,
                messageId: 'use-wrong-function',
              });
              return;
            case 'FunctionDeclaration':
              if (!parent.id?.name.startsWith('use')) {
                context.report({
                  node,
                  messageId: 'use-wrong-function',
                });
              }
              return;
            default:
              context.report({
                node,
                messageId: 'use-not-root',
              });
              return;
            // ERROR
          }
        }
      },
    };
  },
};
