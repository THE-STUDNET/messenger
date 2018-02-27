export function _getDeferred(){
    var deferred: any = {};

    deferred.promise = new Promise((resolve,reject)=> {
        deferred.reject = reject;
        deferred.resolve = resolve;
    });

    return deferred;
}