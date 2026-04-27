import { Link, isRouteErrorResponse, useRouteError } from "react-router-dom";

export function RouteErrorBoundary() {
  const error = useRouteError();
  const isNotFound = isRouteErrorResponse(error) && error.status === 404;

  return (
    <div className="mx-auto max-w-md px-4 py-16 text-center">
      <h1 className="font-heading text-2xl font-medium">
        {isNotFound ? "Fant ikke siden" : "Noe gikk galt"}
      </h1>
      <p className="mt-2 text-muted-foreground">
        {isNotFound
          ? "Denne adressen finnes ikke. Gå tilbake til forsiden."
          : "Vi klarte ikke å vise denne siden. Prøv på nytt om litt."}
      </p>
      <Link
        to="/"
        className="mt-6 inline-block rounded-full bg-primary px-6 py-2 font-medium text-primary-foreground hover:bg-primary/90"
      >
        Til forsiden
      </Link>
    </div>
  );
}
