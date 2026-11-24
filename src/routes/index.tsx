import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "OML Elective Timetabling" },
      { name: "description", content: "Elective Timetabling with Limited Faculty Flexibility — project setup in progress." },
      { property: "og:title", content: "OML Elective Timetabling" },
      { property: "og:description", content: "Elective Timetabling with Limited Faculty Flexibility." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16">
      <div className="w-full max-w-2xl rounded-xl border bg-card p-8 sm:p-12">
        <h1 className="text-3xl font-semibold tracking-tight text-primary sm:text-4xl">OML Elective Timetabling</h1>
        <p className="mt-3 text-lg text-accent-foreground">Elective Timetabling with Limited Faculty Flexibility</p>
        <p className="mt-6 text-muted-foreground">
          Aim: find the minimum number of courses needing scheduling flexibility while supporting students' elective credit requirements.
        </p>
        <div className="mt-8 inline-flex items-center gap-2 rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground">
          <span className="h-2 w-2 rounded-full bg-accent-foreground" aria-hidden />
          Project setup in progress
        </div>
      </div>
    </main>
  );
}
