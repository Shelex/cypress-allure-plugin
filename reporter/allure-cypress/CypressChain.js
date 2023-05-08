module.exports = class Chain {
    constructor() {
        this.chain = [];
        this.currentChainer = null;
    }

    add(chainable) {
        const command = {
            id: chainable.chainerId,
            name: chainable.name,
            type: chainable.type,
            parent: this.currentChainer && this.currentChainer.chainerId,
            children: [],
            passed: true, // will be set false in case failed or failed child command
            finished: false,
            step: null,
            commandLog: null
        };
        this.chain.unshift(command);

        // in case command in enqueued while there is active chainer - treat it as parent
        // so this command should be added as a child to track if we should finish parent command step
        if (command.parent) {
            this.addChild(command.id, command.parent);
        }
        return command;
    }

    getParent(chainerId) {
        const parents = this.chain.filter(
            (command) =>
                command.id === chainerId && !command.finished && command.step
        );

        const withStep = parents.find((command) => command.step.info.name);

        return withStep || parents.shift();
    }

    addChild(commandId, parentId) {
        const parent = this.getParent(parentId);
        // set new child from start as command queue works as LIFO (last in - first out) approach
        parent && parent.children.unshift(commandId);
    }

    getCommand(command, withStep = false) {
        const commands = this.chain.filter(
            (chainable) =>
                chainable.id === command.chainerId &&
                chainable.name === command.name &&
                Boolean(chainable.step) === withStep &&
                !chainable.finished
        );

        return commands.pop();
    }

    getCommandsWithSteps() {
        return this.chain.filter((c) => !c.finished && c.step);
    }

    getLatestWithStep() {
        return this.getCommandsWithSteps().find((c) => c.step.info.name);
    }

    clear() {
        this.chain = [];
    }
};
