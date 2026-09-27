import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import React from 'react';
import {create, act} from 'react-test-renderer';
import {palettes} from '../src/design/tokens.ts';

const require = createRequire(import.meta.url);
const ts = require('typescript');
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
function loadComponent(path, router) {
    const code = ts.transpileModule(readFileSync(new URL(path, import.meta.url), 'utf8'), {
        compilerOptions: {module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.React, esModuleInterop: true},
    }).outputText;
    const modules = {
        react: React,
        'react-native': {View: 'View', Text: 'Text', Image: 'Image', TouchableOpacity: 'TouchableOpacity', StyleSheet: {create: x => x, hairlineWidth: 1}},
        '@expo/vector-icons': {Ionicons: 'Icon'}, 'expo-router': {useRouter: () => router},
        'react-i18next': {useTranslation: () => ({t: key => key})},
        '../context/ThemeContext': {useTheme: () => ({theme: palettes.dark})}, './CoverImage': {default: 'CoverImage', __esModule: true},
    };
    const exports = {};
    vm.runInNewContext(code, {exports, require: name => {
        assert.ok(name in modules, `Unexpected import ${name}`);
        return modules[name];
    }});
    return exports.default;
}
const fixture = {id: 'activity-1', review_id: 'review-1', type: 'review', user_id: 'author-1', user_name: 'Alice',
    album: 'Discovery', artist: 'Daft Punk', title: 'Un disque à redécouvrir', content: 'Une review longue. '.repeat(40), rating: 4.5,
    globalRating: 2, userReviewRating: 1, likes_count: 3};

test('community review can expand without navigating; comments target the review', async () => {
    const routes = [];
    const Card = loadComponent('../src/components/CommunityCard.tsx', {push: route => routes.push(route)});
    let tree;
    await act(() => {tree = create(React.createElement(Card, {item: fixture, dateLabel: '1h', onLike: () => {}}));});
    const body = () => tree.root.findAllByType('Text').find(node => node.props.children === fixture.content);
    assert.equal(body().props.numberOfLines, 4);
    await act(() => tree.root.findAllByType('TouchableOpacity').find(node => node.props.accessibilityState?.expanded === false).props.onPress());
    assert.equal(body().props.numberOfLines, undefined);
    assert.equal(routes.length, 0);
    assert.ok(tree.root.findAllByType('View').some(node => node.props.accessibilityLabel === 'rating 4.5/5'));
    await act(() => tree.root.findByProps({accessibilityLabel: 'tab_comments'}).props.onPress());
    assert.equal(routes[0].params.id, 'review-1');
    await act(() => tree.unmount());
});

test('like uses the activity id; absent review ids do not create broken comment links', async () => {
    const likes = [];
    const Card = loadComponent('../src/components/CommunityCard.tsx', {push: () => {}});
    let tree;
    await act(() => {tree = create(React.createElement(Card, {item: {...fixture, review_id: undefined}, dateLabel: '', onLike: id => likes.push(id)}));});
    await act(() => tree.root.findByProps({accessibilityLabel: 'like_singular'}).props.onPress());
    assert.deepEqual(likes, ['activity-1']);
    assert.equal(tree.root.findAllByProps({accessibilityLabel: 'tab_comments'}).length, 0);
    await act(() => tree.unmount());
});

test('back returns to previous page or falls back to statistics on a direct link', async () => {
    for (const hasHistory of [true, false]) {
        const actions = [];
        const Back = loadComponent('../src/components/BackButton.tsx', {canGoBack: () => hasHistory, back: () => actions.push('back'), replace: path => actions.push(path)});
        let tree;
        await act(() => {tree = create(React.createElement(Back, {fallback: '/stats'}));});
        await act(() => tree.root.findByType('TouchableOpacity').props.onPress());
        assert.deepEqual(actions, [hasHistory ? 'back' : '/stats']);
        await act(() => tree.unmount());
    }
});
