import { useNavigate } from 'react-router-dom';
import { useCaseSchema } from '../../hooks/useCases';
import { useCreateCase } from '../../hooks/useCases';
import { DynamicForm } from '../../shared/components/DynamicForm';

export function NewCasePage() {
  const navigate = useNavigate();
  const { data: schema, isPending: isSchemaPending, isError: isSchemaError } = useCaseSchema();
  const { mutate: createCase, isPending: isCreating, error: createError } = useCreateCase();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight">New case</h1>
        <p className="text-sm text-muted-foreground">Register a new case for Central Metropolitan Police Department.</p>
      </div>

      <div className="rounded-lg border border-border bg-card p-6">
        {isSchemaPending && <p className="text-sm text-muted-foreground">Loading case fields…</p>}
        {isSchemaError && <p className="text-sm text-critical">Could not load the Cases table schema.</p>}
        {schema && (
          <DynamicForm
            columns={schema}
            submitLabel="Create case"
            isSubmitting={isCreating}
            submitError={createError instanceof Error ? createError.message : null}
            onCancel={() => navigate('/cases')}
            onSubmit={(values) =>
              createCase(values, {
                onSuccess: (created) => {
                  const newCase = created[0];
                  navigate(newCase ? `/cases/${newCase.ROWID}` : '/cases');
                },
              })
            }
          />
        )}
      </div>
    </div>
  );
}
