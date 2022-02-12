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
        this.chain.push(command);

        // in case command in enqueued while there is active chainer - treat it as parent
        // so this command should be added as a child to track if we should finish parent command step
        if (command.parent) {
            this.addChild(command.id, command.parent);
        }
        return command;
    }

    getParent(chainerId) {
        return this.chain.find(
            (command) =>
                command.id === chainerId && !command.finished && command.step
        );
    }

    addChild(commandId, parentId) {
        const parent = this.getParent(parentId);
        // set new child from start as command queue works as LIFO (last in - first out) approach
        parent && parent.children.unshift(commandId);
    }

    getCommand(command, withStep = false) {
        return this.chain.find(
            (chainable) =>
                chainable.id === command.chainerId &&
                chainable.name === command.name &&
                Boolean(chainable.step) === withStep &&
                !chainable.finished
        );
    }

    getCommandsWithSteps() {
        return this.chain.filter((c) => !c.finished && c.step).reverse();
    }

    getLatestWithStep() {
        return this.getCommandsWithSteps().find((c) => c.step.info.name);
    }

    clear() {
        this.chain = [];
    }
};
