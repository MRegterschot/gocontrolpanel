import { useState, useEffect } from "react";


export function useSpacetimeProcedure<Args, Result>(
    procedureHook: (args: Args) => Promise<Result>,
    args: Args
) {
    const [data, setData] = useState<Result | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);

    const serializedArgs = JSON.stringify(args);

    useEffect(() => {
        let isMounted = true;
        setIsLoading(true);

        async function execute() {
            try {
                const result = await procedureHook(JSON.parse(serializedArgs));
                if (isMounted) setData(result);
            } catch (err) {
                if (isMounted) setError(err instanceof Error ? err : new Error(String(err)));
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }

        execute();
        return () => { isMounted = false; };
    }, [serializedArgs, procedureHook]);

    return { data, isLoading, error };
}
