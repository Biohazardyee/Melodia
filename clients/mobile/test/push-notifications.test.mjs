import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import vm from 'node:vm';
import {setImmediate} from 'node:timers/promises';

const require = createRequire(import.meta.url);
const ts = require('typescript');
const source = readFileSync(new URL('../src/hook/usePushNotifications.ts', import.meta.url), 'utf8');
const compiled = ts.transpileModule(source, {
    compilerOptions: {module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true},
}).outputText;

// Exercise the real hook without loading native modules in Node.
function mount({platform = 'ios', expoGo = false, device = true, userId = 'test-user', granted = true, tokenRequest} = {}) {
    const calls = [];
    let cleanup;
    const notifications = {
        setNotificationHandler: () => calls.push('handler'),
        setNotificationChannelAsync: async () => calls.push('channel'),
        AndroidImportance: {DEFAULT: 3},
        getPermissionsAsync: async () => ({status: granted ? 'granted' : 'denied'}),
        requestPermissionsAsync: async () => ({status: 'denied'}),
        getExpoPushTokenAsync: async () => {
            calls.push('token');
            return tokenRequest ? tokenRequest : {data: 'fixture-push-token'};
        },
    };
    const modules = {
        react: {useEffect: effect => { cleanup = effect(); }},
        'react-native': {Platform: {OS: platform}},
        expo: {isRunningInExpoGo: () => expoGo},
        'expo-device': {isDevice: device},
        'expo-secure-store': {getItemAsync: async () => 'fixture-session'},
        '../api/client': {post: async (url, body) => calls.push({url, ...body})},
    };
    const exports = {};
    vm.runInNewContext(compiled, {
        exports,
        console,
        require: name => {
            if (name === 'expo-notifications') { calls.push('import'); return notifications; }
            assert.ok(name in modules, `Unexpected dependency: ${name}`);
            return modules[name];
        },
    });
    exports.usePushNotifications(userId);
    return {calls, unmount: () => cleanup?.()};
}

test('Expo Go, web, simulators and signed-out sessions never load remote push', async () => {
    for (const options of [{expoGo: true}, {platform: 'web'}, {device: false}, {userId: null}]) {
        const instance = mount(options);
        await setImmediate();
        assert.deepEqual(instance.calls, []);
    }
});

test('native Android registers a channel before requesting a token', async () => {
    const instance = mount({platform: 'android'});
    await setImmediate();
    assert.deepEqual(instance.calls.slice(0, 4), ['import', 'handler', 'channel', 'token']);
    const request = instance.calls[4];
    assert.equal(request.url, '/users/update-push-token');
    assert.equal(request.user_id, 'test-user');
    assert.equal(request.token, 'fixture-push-token');
});

test('denied permissions never register a push token', async () => {
    const instance = mount({granted: false});
    await setImmediate();
    assert.deepEqual(instance.calls, ['import', 'handler']);
});

test('an unmounted session cannot submit a late token', async () => {
    let resolveToken;
    const tokenRequest = new Promise(resolve => { resolveToken = resolve; });
    const instance = mount({tokenRequest});
    await setImmediate();
    instance.unmount();
    resolveToken({data: 'late-token'});
    await setImmediate();
    assert.deepEqual(instance.calls, ['import', 'handler', 'token']);
});
